// functions/getMarketData.js
// Uses Node.js built-in https only — zero npm dependencies

const https = require('https');

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const FRED_KEY = process.env.FRED_API_KEY;

const FINNHUB_SYMBOLS = [
  'SPY', 'QQQ', 'DIA', 'MBB', 'TLT', 'VMBS', 'BINANCE:BTCUSDT', 'UUP',
];

const FRED_SERIES = [
  'OBMMIC30YF',    // OBMMI 30Y conventional (daily)
  'OBMMIFHA30YF',  // OBMMI 30Y FHA (daily)
  'OBMMIVA30YF',   // OBMMI 30Y VA (daily)
  'OBMMIJUMBO30YF',// OBMMI 30Y Jumbo (daily)
  'OBMMIC15YF',    // OBMMI 15Y conventional (daily)
  'MORTGAGE30US',  // Freddie Mac PMMS 30Y (weekly)
  'DGS1MO',        // 1-month Treasury yield
  'DGS3MO',        // 3-month Treasury yield
  'DGS6MO',        // 6-month Treasury yield
  'DGS1',          // 1-year Treasury yield
  'DGS2',          // 2-year Treasury yield
  'DGS5',          // 5-year Treasury yield
  'DGS10',         // 10-year Treasury yield
  'DGS20',         // 20-year Treasury yield
  'DGS30',         // 30-year Treasury yield
  'T10Y2Y',        // 10Y-2Y spread (daily)
  'T10YIE',        // 10Y breakeven inflation (daily)
  'HOUST',         // Housing starts (monthly)
  'CSUSHPINSA',    // Case-Shiller HPI (monthly)
  'UMCSENT',       // Consumer sentiment (monthly)
  'PERMIT',        // Building permits (monthly)
];

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.setTimeout(7000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

async function batchAll(items, fn, batchSize) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + batchSize < items.length) {
      await new Promise(r => setTimeout(r, 250));
    }
  }
  return results;
}

async function fetchFinnhub(symbol) {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`;
    const res = await get(url);
    if (res.status !== 200) return { symbol, error: `HTTP ${res.status}` };
    const q = JSON.parse(res.body);
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
    const res = await get(url);
    if (res.status !== 200) return { seriesId, error: `HTTP ${res.status}` };
    const d = JSON.parse(res.body);
    if (d.error_message) return { seriesId, error: d.error_message };
    const obs = (d.observations || []).filter(o => o.value !== '.');
    if (!obs.length) return { seriesId, error: 'No observations' };
    return {
      seriesId,
      latest: parseFloat(obs[0].value),
      latestDate: obs[0].date,
      prev: obs[1] ? parseFloat(obs[1].value) : null,
      prevDate: obs[1] ? obs[1].date : null,
      change: obs[1]
        ? parseFloat((parseFloat(obs[0].value) - parseFloat(obs[1].value)).toFixed(4))
        : null,
    };
  } catch (e) {
    return { seriesId, error: e.message };
  }
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
    const [finnhubResults, fredResults] = await Promise.all([
      Promise.all(FINNHUB_SYMBOLS.map(fetchFinnhub)),
      FRED_KEY ? batchAll(FRED_SERIES, fetchFredSeries, 5) : Promise.resolve([]),
    ]);

    const equities = {};
    finnhubResults.forEach(r => { equities[r.symbol] = r; });

    const fred = {};
    fredResults.forEach(r => { if (r.seriesId) fred[r.seriesId] = r; });

    // Build yield curve object from FRED DGS series
    const yieldCurve = {
      source: 'FRED H.15',
      date: fred['DGS10']?.latestDate || null,
      m1:  fred['DGS1MO']?.latest || null,
      m3:  fred['DGS3MO']?.latest || null,
      m6:  fred['DGS6MO']?.latest || null,
      y1:  fred['DGS1']?.latest   || null,
      y2:  fred['DGS2']?.latest   || null,
      y5:  fred['DGS5']?.latest   || null,
      y10: fred['DGS10']?.latest  || null,
      y20: fred['DGS20']?.latest  || null,
      y30: fred['DGS30']?.latest  || null,
    };

    // Synthetic MBS indicator: MBB 70% + TLT 30%
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
        yieldCurve,
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
