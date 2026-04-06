// functions/getMarketData.js
const fetch = require('node-fetch');

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const FRED_KEY = process.env.FRED_API_KEY;

const FINNHUB_SYMBOLS = [
  'SPY', 'QQQ', 'DIA', 'MBB', 'TLT', 'VMBS', 'BINANCE:BTCUSDT', 'UUP',
];

const FRED_SERIES = [
  'OBMMIC30YF', 'OBMMIFHA30YF', 'OBMMIVA30YF', 'OBMMIJUMBO30YF', 'OBMMIC15YF',
  'MORTGAGE30US', 'MORTGAGE15US',
  'T10Y2Y', 'T10YIE', 'HOUST', 'CSUSHPINSA', 'UMCSENT', 'PERMIT',
];

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

async function safeFetch(url, ms) {
  return Promise.race([fetch(url), timeout(ms)]);
}

async function fetchFinnhub(symbol) {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`;
    const r = await safeFetch(url, 6000);
    if (!r.ok) return { symbol, error: `HTTP ${r.status}` };
    const q = await r.json();
    if (!q || !q.c || q.c === 0) return { symbol, error: 'No data' };
    const current = parseFloat(q.c);
    const prev = parseFloat(q.pc);
    const change = current - prev;
    const pct = prev !== 0 ? (change / prev) * 100 : 0;
    return {
      symbol,
      current: parseFloat(current.toFixed(2)),
      prev: parseFloat(prev.toFixed(2)),
      change: parseFloat(change.toFixed(3)),
      pct: parseFloat(pct.toFixed(3)),
      high: q.h || null,
      low: q.l || null,
      open: q.o || null,
      timestamp: q.t || null,
    };
  } catch (e) {
    return { symbol, error: e.message };
  }
}

async function fetchFredSeries(seriesId) {
  if (!FRED_KEY) return { seriesId, error: 'No FRED key' };
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_KEY}&limit=3&sort_order=desc&file_type=json`;
    const r = await safeFetch(url, 6000);
    if (!r.ok) return { seriesId, error: `HTTP ${r.status}` };
    const d = await r.json();
    if (d.error_message) return { seriesId, error: d.error_message };
    const obs = (d.observations || []).filter(o => o.value !== '.');
    if (!obs.length) return { seriesId, error: 'No observations' };
    return {
      seriesId,
      latest: parseFloat(obs[0].value),
      latestDate: obs[0].date,
      prev: obs[1] ? parseFloat(obs[1].value) : null,
      prevDate: obs[1] ? obs[1].date : null,
      change: obs[1] ? parseFloat((parseFloat(obs[0].value) - parseFloat(obs[1].value)).toFixed(4)) : null,
    };
  } catch (e) {
    return { seriesId, error: e.message };
  }
}

async function fetchTreasuryYieldCurve() {
  // Try current month and previous month in parallel — take whichever has data
  const now = new Date();
  const months = [0, 1, 2].map(i => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  async function tryMonth(ym) {
    const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=${ym}`;
    const r = await safeFetch(url, 8000);
    if (!r.ok) return null;
    const txt = await r.text();
    const entries = [...txt.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    if (!entries.length) return null;
    const last = entries[entries.length - 1][1];

    function ex(tag) {
      const m = last.match(new RegExp(`<[^>]*${tag}[^>]*>([\\d.]+)<`));
      return m ? parseFloat(m[1]) : null;
    }
    function exStr(tag) {
      const m = last.match(new RegExp(`<[^>]*${tag}[^>]*>([^<]+)<`));
      return m ? m[1].trim() : null;
    }

    const date = exStr('NEW_DATE');
    const result = {
      date: date ? date.slice(0, 10) : ym,
      m1: ex('d_1_MONTH'), m3: ex('d_3_MONTH'), m6: ex('d_6_MONTH'),
      y1: ex('d_1_YEAR'),  y2: ex('d_2_YEAR'),  y3: ex('d_3_YEAR'),
      y5: ex('d_5_YEAR'),  y7: ex('d_7_YEAR'),  y10: ex('d_10_YEAR'),
      y20: ex('d_20_YEAR'), y30: ex('d_30_YEAR'),
    };
    return (result.y10 || result.y2) ? result : null;
  }

  // Try months sequentially — stop at first success
  for (const ym of months) {
    try {
      const result = await tryMonth(ym);
      if (result) return result;
    } catch (e) {
      continue;
    }
  }
  return { error: 'No Treasury data available' };
}

exports.handler = async function (event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Finnhub and FRED run in parallel — Treasury runs separately
    // This avoids one slow source blocking everything else
    const [finnhubResults, fredResults, treasury] = await Promise.all([
      Promise.all(FINNHUB_SYMBOLS.map(fetchFinnhub)),
      FRED_KEY ? Promise.all(FRED_SERIES.map(fetchFredSeries)) : Promise.resolve([]),
      fetchTreasuryYieldCurve(),
    ]);

    const equities = {};
    finnhubResults.forEach(r => { equities[r.symbol] = r; });

    const fred = {};
    fredResults.forEach(r => { if (r.seriesId) fred[r.seriesId] = r; });

    // Synthetic MBS indicator
    let syntheticMBS = null;
    const mbb = equities['MBB'];
    const tlt = equities['TLT'];
    if (mbb && !mbb.error && tlt && !tlt.error) {
      const mbbPct = mbb.pct;
      const tltPct = tlt.pct;
      const composite = (mbbPct * 0.70) + (tltPct * 0.30);
      syntheticMBS = {
        compositePct: parseFloat(composite.toFixed(4)),
        estimatedTicks: parseFloat((composite * 32).toFixed(1)),
        direction: composite > 0.05 ? 'better' : composite < -0.05 ? 'worse' : 'flat',
        inputs: { mbbPct, tltPct },
        note: 'Synthetic estimate: MBB (70%) + TLT (30%). Not a live MBS price.',
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        equities,
        fred,
        treasury,
        syntheticMBS,
        meta: {
          finnhubKey: !!FINNHUB_KEY,
          fredKey: !!FRED_KEY,
          symbolsRequested: FINNHUB_SYMBOLS.length,
          symbolsLoaded: finnhubResults.filter(r => !r.error).length,
          fredSeriesRequested: FRED_SERIES.length,
          fredSeriesLoaded: fredResults.filter(r => !r.error).length,
        },
      }),
    };
  } catch (e) {
    console.error('getMarketData error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
