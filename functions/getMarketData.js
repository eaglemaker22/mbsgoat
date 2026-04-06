// functions/getMarketData.js
// Consolidated market data proxy for MBSGOAT Playground
// Handles: Finnhub (equities, ETFs, BTC), FRED (OBMMI, PMMS, econ), Treasury XML

const fetch = require('node-fetch');

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const FRED_KEY = process.env.FRED_API_KEY;

// All Finnhub symbols we want
const FINNHUB_SYMBOLS = [
  'SPY',               // S&P 500
  'QQQ',               // Nasdaq 100
  'DIA',               // Dow Jones
  'MBB',               // iShares Agency MBS ETF — core synthetic indicator input
  'TLT',               // 20Y+ Treasury ETF — duration proxy
  'VMBS',              // Vanguard MBS ETF
  'ZN=F',              // 10Y Treasury futures (may not be on Finnhub free tier)
  'BINANCE:BTCUSDT',   // Bitcoin
  'UUP',               // US Dollar index ETF
];

// FRED series we want
const FRED_SERIES = [
  'OBMMIC30YF',        // OBMMI 30Y conventional
  'OBMMIFHA30YF',      // OBMMI 30Y FHA
  'OBMMIVA30YF',       // OBMMI 30Y VA
  'OBMMIJUMBO30YF',    // OBMMI 30Y Jumbo
  'OBMMIC15YF',        // OBMMI 15Y conventional
  'MORTGAGE30US',      // Freddie Mac PMMS 30Y
  'MORTGAGE15US',      // Freddie Mac PMMS 15Y
  'T10Y2Y',            // 10Y-2Y spread
  'T10YIE',            // 10Y breakeven inflation
  'HOUST',             // Housing starts
  'CSUSHPINSA',        // Case-Shiller HPI
  'UMCSENT',           // Consumer sentiment
  'PERMIT',            // Building permits
];

async function fetchFinnhub(symbol) {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`;
    const r = await fetch(url, { timeout: 8000 });
    if (!r.ok) return { symbol, error: `HTTP ${r.status}` };
    const q = await r.json();
    if (!q || q.c === undefined || q.c === 0) return { symbol, error: 'No data' };
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
  if (!FRED_KEY) return { seriesId, error: 'No FRED key configured' };
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_KEY}&limit=3&sort_order=desc&file_type=json`;
    const r = await fetch(url, { timeout: 8000 });
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
  try {
    const ym = new Date().toISOString().slice(0, 7).replace('-', '');
    const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=${ym}`;
    const r = await fetch(url, { timeout: 10000 });
    if (!r.ok) return { error: `HTTP ${r.status}` };
    const txt = await r.text();

    // Parse XML manually — no DOM parser in Node
    const entries = [...txt.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    if (!entries.length) return { error: 'No entries' };

    const lastEntry = entries[entries.length - 1][1];

    function extract(tag) {
      const m = lastEntry.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`));
      return m ? parseFloat(m[1]) : null;
    }
    function extractStr(tag) {
      const m = lastEntry.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`));
      return m ? m[1].trim() : null;
    }

    const date = extractStr('NEW_DATE') || extractStr('d:NEW_DATE');

    return {
      date: date ? date.slice(0, 10) : 'unknown',
      m1:  extract('d_1_MONTH')  || extract('BC_1MONTH'),
      m3:  extract('d_3_MONTH')  || extract('BC_3MONTH'),
      m6:  extract('d_6_MONTH')  || extract('BC_6MONTH'),
      y1:  extract('d_1_YEAR')   || extract('BC_1YEAR'),
      y2:  extract('d_2_YEAR')   || extract('BC_2YEAR'),
      y3:  extract('d_3_YEAR')   || extract('BC_3YEAR'),
      y5:  extract('d_5_YEAR')   || extract('BC_5YEAR'),
      y7:  extract('d_7_YEAR')   || extract('BC_7YEAR'),
      y10: extract('d_10_YEAR')  || extract('BC_10YEAR'),
      y20: extract('d_20_YEAR')  || extract('BC_20YEAR'),
      y30: extract('d_30_YEAR')  || extract('BC_30YEAR'),
    };
  } catch (e) {
    return { error: e.message };
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
    // Run everything in parallel
    const [finnhubResults, fredResults, treasury] = await Promise.all([
      Promise.all(FINNHUB_SYMBOLS.map(fetchFinnhub)),
      FRED_KEY ? Promise.all(FRED_SERIES.map(fetchFredSeries)) : Promise.resolve([]),
      fetchTreasuryYieldCurve(),
    ]);

    // Shape Finnhub results into a clean object
    const equities = {};
    finnhubResults.forEach(r => {
      equities[r.symbol] = r;
    });

    // Shape FRED results
    const fred = {};
    fredResults.forEach(r => {
      if (r.seriesId) fred[r.seriesId] = r;
    });

    // Compute synthetic MBS indicator if MBB loaded
    let syntheticMBS = null;
    const mbb = equities['MBB'];
    const tlt = equities['TLT'];
    if (mbb && !mbb.error && tlt && !tlt.error) {
      // Weighted synthetic: MBB drives 70%, TLT duration 30%
      // Expressed as estimated 32nds-equivalent +/- (scale to typical MBS daily range)
      const mbbPct = mbb.pct;
      const tltPct = tlt.pct;
      const composite = (mbbPct * 0.70) + (tltPct * 0.30);
      // Scale to approximate MBS price points (MBS trades in 32nds, ~1% = 32 ticks)
      const estimatedTicks = composite * 32;
      syntheticMBS = {
        compositePct: parseFloat(composite.toFixed(4)),
        estimatedTicks: parseFloat(estimatedTicks.toFixed(1)),
        estimatedPoints: parseFloat((composite).toFixed(4)),
        direction: composite > 0.05 ? 'better' : composite < -0.05 ? 'worse' : 'flat',
        inputs: { mbbPct, tltPct },
        note: 'Synthetic estimate from MBB (70%) + TLT (30%). Not a live MBS price.',
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
