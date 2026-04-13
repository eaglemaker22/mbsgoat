// functions/getMarketData.js
// Feeds lockiq-beta.html with all required data fields.
// Output shape contract is documented at bottom of this file.

const https = require('https');

// ── ENV ──────────────────────────────────────────────────────────────────────
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const FRED_KEY    = process.env.FRED_API_KEY;
const FB_PROJECT  = process.env.FIREBASE_PROJECT_ID;
const FB_EMAIL    = process.env.FIREBASE_CLIENT_EMAIL;
const FB_KEY      = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : null;

// ── FINNHUB SYMBOLS ──────────────────────────────────────────────────────────
// Equities: DIA (DOW proxy), QQQ (NASDAQ proxy), SPY (S&P 500 proxy)
// MBB: real-time MBS ETF — used for regression input
// BTC: crypto risk signal
// VIX via Finnhub as a real-time supplement to FRED VIXCLS (end-of-day only)
const FINNHUB_EQUITIES = ['DIA', 'QQQ', 'SPY'];
const FINNHUB_OTHER    = ['MBB', 'BINANCE:BTCUSDT'];

// Approximate index multipliers from ETF prices (for display only)
// DIA ≈ DOW / 100   →  multiply by 100
// QQQ ≈ NASDAQ / 40 →  multiply by 40
// SPY ≈ S&P500 / 10 →  multiply by 10
const ETF_INDEX_MULT = { DIA: 100, QQQ: 40, SPY: 10 };

// ── FRED SERIES ──────────────────────────────────────────────────────────────
const FRED_SERIES = [
  'OBMMIC30YF',   // Optimal Blue 30Y Conv
  'OBMMIC15YF',   // Optimal Blue 15Y Conv
  'OBMMIFHA30YF', // Optimal Blue FHA 30Y
  'OBMMIVA30YF',  // Optimal Blue VA 30Y
  'MORTGAGE30US', // Freddie Mac PMMS 30Y
  'MORTGAGE15US', // Freddie Mac PMMS 15Y
  'DGS2',         // 2Y Treasury yield (for spread)
  'DGS10',        // 10Y Treasury yield (FRED fallback)
  'DGS30',        // 30Y Treasury yield
  'T10Y2Y',       // 10Y-2Y spread (pre-computed by FRED)
  'FEDFUNDS',     // Effective Fed Funds
  'VIXCLS',       // VIX end-of-day
];

// ── FOMC DATES ───────────────────────────────────────────────────────────────
const FOMC_DATES = [
  '2026-04-30', '2026-06-17', '2026-07-29', '2026-09-16',
  '2026-11-04', '2026-12-16',
];

// ── REGRESSION CONSTANTS (confirmed model, May–Aug 2025) ─────────────────────
// ΔUMBS5.5 (pts) = (−2.387 × Δ10Y_bps/100) + (0.069 × ΔZN_bps/100) + (0.122 × ΔMBB_bps/100)
// We work in bps throughout for the frontend signal:
// estMove_bps = (-2.387 * d10y_bps) + (0.069 * dZN_bps) + (0.122 * dMBB_bps)
// where dXX_bps for yields = change in yield * 100
// for price instruments (ZN, MBB): change_bps = (current - open) / open * 10000
const REG = { b10y: -2.387, bZN: 0.069, bMBB: 0.122 };

// ── REPRICE THRESHOLDS (bps adverse) ─────────────────────────────────────────
const THRESHOLDS = { safe: 15, watch: 25, caution: 40, reprice: 62 };

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

// Batch async calls with a short pause between batches to avoid rate limits
async function batchAll(items, fn, size = 5) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    const results = await Promise.all(items.slice(i, i + size).map(fn));
    out.push(...results);
    if (i + size < items.length) await new Promise(r => setTimeout(r, 250));
  }
  return out;
}

function safeFloat(val, fallback = null) {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}

// Convert price-instrument change to basis points
// (current - open) / open * 10000
function priceToBps(current, open) {
  if (!current || !open || open === 0) return null;
  return +((current - open) / open * 10000).toFixed(2);
}

// Next FOMC meeting
function nextFomc() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const d of FOMC_DATES) {
    const dt = new Date(d + 'T00:00:00');
    if (dt >= today) {
      const days = Math.ceil((dt - today) / 86400000);
      return { date: d, daysAway: days };
    }
  }
  return null;
}

// Format a date string as "Apr 12"
function fmtDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return iso; }
}

// ─────────────────────────────────────────────────────────────────────────────
// FINNHUB
// ─────────────────────────────────────────────────────────────────────────────

async function fetchFinnhub(symbol) {
  if (!FINNHUB_KEY) return { symbol, error: 'No Finnhub key' };
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`;
    const res = await get(url);
    if (res.status !== 200) return { symbol, error: `HTTP ${res.status}` };
    const q = JSON.parse(res.body);
    if (!q || !q.c || q.c === 0) return { symbol, error: 'No data' };
    const current  = parseFloat(q.c);
    const prev     = parseFloat(q.pc);
    const open     = parseFloat(q.o) || null;
    const change   = current - prev;
    const changePct = prev !== 0 ? (change / prev) * 100 : 0;
    return {
      symbol,
      current:    +current.toFixed(3),
      prev:       +prev.toFixed(3),
      open:       open ? +open.toFixed(3) : null,
      high:       q.h ? +parseFloat(q.h).toFixed(3) : null,
      low:        q.l ? +parseFloat(q.l).toFixed(3)  : null,
      change:     +change.toFixed(3),
      changePct:  +changePct.toFixed(3),
      timestamp:  q.t || null,
    };
  } catch (e) {
    return { symbol, error: e.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FRED
// ─────────────────────────────────────────────────────────────────────────────

async function fetchFredSeries(seriesId) {
  if (!FRED_KEY) return { seriesId, error: 'No FRED key' };
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_KEY}&limit=7&sort_order=desc&file_type=json`;
    const res = await get(url);
    if (res.status !== 200) return { seriesId, error: `HTTP ${res.status}` };
    const d = JSON.parse(res.body);
    if (d.error_message) return { seriesId, error: d.error_message };
    const obs = (d.observations || []).filter(o => o.value !== '.');
    if (!obs.length) return { seriesId, error: 'No observations' };
    const vals = obs.slice(0, 5).map(o => ({ date: o.date, value: parseFloat(o.value) }));
    let trend = 'flat';
    if (vals.length >= 3) {
      const diff = vals[0].value - vals[Math.min(4, vals.length - 1)].value;
      if (diff > 0.02) trend = 'up';
      else if (diff < -0.02) trend = 'down';
    }
    return {
      seriesId,
      latest:      vals[0].value,
      latestDate:  vals[0].date,
      prev:        vals[1]?.value || null,
      prevDate:    vals[1]?.date  || null,
      change:      vals[1] ? +((vals[0].value - vals[1].value).toFixed(4)) : null,
      trend,
      history:     vals,
    };
  } catch (e) {
    return { seriesId, error: e.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE (REST — no SDK)
// ─────────────────────────────────────────────────────────────────────────────

async function getFirebaseToken() {
  try {
    const now    = Math.floor(Date.now() / 1000);
    const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: FB_EMAIL, sub: FB_EMAIL,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now, exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/datastore',
    })).toString('base64url');

    const crypto = require('crypto');
    const sign   = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const sig = sign.sign(FB_KEY, 'base64url');
    const jwt = `${header}.${payload}.${sig}`;

    const body     = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    const tokenRes = await new Promise((resolve, reject) => {
      const req = https.request('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length':  Buffer.byteLength(body),
        },
      });
      req.setTimeout(6000, () => { req.destroy(); reject(new Error('token timeout')); });
      req.on('error', reject);
      req.on('response', (res) => {
        let d = '';
        res.on('data', c => { d += c; });
        res.on('end', () => resolve(JSON.parse(d)));
      });
      req.write(body);
      req.end();
    });
    return tokenRes.access_token || null;
  } catch { return null; }
}

function flattenFirestore(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if      (v.stringValue  !== undefined) out[k] = v.stringValue;
    else if (v.doubleValue  !== undefined) out[k] = v.doubleValue;
    else if (v.integerValue !== undefined) out[k] = parseInt(v.integerValue);
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
    else if (v.timestampValue !== undefined) out[k] = v.timestampValue;
    else if (v.nullValue    !== undefined) out[k] = null;
  }
  return out;
}

async function fetchFirestore(collection, doc) {
  if (!FB_PROJECT || !FB_EMAIL || !FB_KEY) return null;
  try {
    const jwt = await getFirebaseToken();
    if (!jwt) return null;
    const url = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents/${collection}/${doc}`;
    return new Promise((resolve) => {
      const req = https.request(url, {
        method:  'GET',
        headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      });
      req.setTimeout(6000, () => { req.destroy(); resolve(null); });
      req.on('error', () => resolve(null));
      req.on('response', (res) => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.fields ? flattenFirestore(parsed.fields) : null);
          } catch { resolve(null); }
        });
      });
      req.end();
    });
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────

function computeSignal(d10yBps, dZNBps, dMBBBps) {
  const d10y    = d10yBps  || 0;
  const dZN     = dZNBps   || 0;
  const dMBB    = dMBBBps  || 0;
  const estMove = (REG.b10y * d10y) + (REG.bZN * dZN) + (REG.bMBB * dMBB);
  const adverse = -estMove; // positive = MBS worsening

  let state, riskLabel;
  if      (adverse <= THRESHOLDS.safe)    { state = 'SAFE';            riskLabel = 'No reprice risk'; }
  else if (adverse <= THRESHOLDS.watch)   { state = 'WATCH';           riskLabel = `Near-par ${adverse.toFixed(1)} bps`; }
  else if (adverse <= THRESHOLDS.caution) { state = 'CAUTION';         riskLabel = `Near-par ${adverse.toFixed(1)} bps`; }
  else if (adverse <= THRESHOLDS.reprice) { state = 'REPRICE LIKELY';  riskLabel = `Above-par ${adverse.toFixed(1)} bps`; }
  else                                    { state = 'REPRICE CERTAIN'; riskLabel = `DANGER ${adverse.toFixed(1)} bps`; }

  return {
    state,
    estMoveBps:  +estMove.toFixed(2),
    adverseBps:  +adverse.toFixed(2),
    riskLabel,
    inputs: { d10yBps: +d10y.toFixed(2), dZNBps: +dZN.toFixed(2), dMBBBps: +dMBB.toFixed(2) },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────

exports.handler = async function (event) {
  const headers = {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':'Content-Type',
    'Cache-Control':               'no-cache, no-store',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    // ── Parallel fetch everything ──────────────────────────────────────────
    const allFinnhubSymbols = [...FINNHUB_EQUITIES, ...FINNHUB_OTHER];

    // Get Firebase token once, reuse for all Firestore calls
const fbToken = await getFirebaseToken();
const fsGet = (collection, doc) => {
  if (!FB_PROJECT || !fbToken) return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents/${collection}/${doc}`;
    const req = https.request(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${fbToken}`, 'Content-Type': 'application/json' },
    });
    req.setTimeout(6000, () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
    req.on('response', (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.fields ? flattenFirestore(parsed.fields) : null);
        } catch { resolve(null); }
      });
    });
    req.end();
  });
};

const [
  finnhubResults,
  fredResults,
  fsShadow,
  fsUS10Y,
  fsUS30Y,
  fsMBS,
  fsBrokerRates,
] = await Promise.all([
  batchAll(allFinnhubSymbols, fetchFinnhub, 5),
  FRED_KEY ? batchAll(FRED_SERIES, fetchFredSeries, 5) : Promise.resolve([]),
  fsGet('market_data', 'shadow_bonds'),
  fsGet('market_data', 'us10y_current'),
  fsGet('market_data', 'us30y_current'),
  fsGet('market_data', 'mbs_products'),
  fsGet('market_data', 'broker_rates'),
]);

    // Index results
    const fh = {};
    finnhubResults.forEach(r => { fh[r.symbol] = r; });

    const fred = {};
    fredResults.forEach(r => { if (r.seriesId) fred[r.seriesId] = r; });

    // ── 10Y yield (Firestore preferred, FRED fallback) ─────────────────────
    const us10yCurrent    = safeFloat(fsUS10Y?.US10Y_Current)       || fred['DGS10']?.latest   || null;
    const us10yOpen       = safeFloat(fsUS10Y?.US10Y_Open)           || null;
    const us10yPriorClose = safeFloat(fsUS10Y?.US10Y_PriorDayClose)  || null;
    const us10yHigh       = safeFloat(fsUS10Y?.US10Y_TodayHigh)      || null;
    const us10yLow        = safeFloat(fsUS10Y?.US10Y_TodayLow)       || null;
    const us10yDailyChg   = safeFloat(fsUS10Y?.US10Y_Daily_Change)   || null;

    // 10Y change in bps from open (for regression)
    // Daily_Change from scraper is in yield points (e.g. 0.061 = +6.1 bps)
    // Convert to bps: multiply by 100
    const us10yChangeBps = us10yDailyChg != null
      ? +(us10yDailyChg * 100).toFixed(2)
      : (us10yCurrent && us10yOpen ? +((us10yCurrent - us10yOpen) * 100).toFixed(2) : null);

    // ── ZN from Firestore shadow_bonds ─────────────────────────────────────
    // scraper writes: ZN_Current, ZN_Open, ZN_Daily_Change (in price points)
    const znCurrent    = safeFloat(fsShadow?.ZN1_Current);
    const znOpen       = safeFloat(fsShadow?.ZN1_Open);
    const znPriorClose = safeFloat(fsShadow?.ZN1_PriorDayClose);
    const znHigh       = safeFloat(fsShadow?.ZN1_TodayHigh);
    const znLow        = safeFloat(fsShadow?.ZN1_TodayLow);
    const znDailyChg   = safeFloat(fsShadow?.ZN1_Daily_Change);
    // ZN change in bps: price change as % of par, × 100
    // ZN trades near 109, par = 100; 1 point = ~0.917% of par
    // Simplest: use priceToBps (change/open * 10000) — consistent with MBB
    const znChangeBps  = (znCurrent && znOpen)
      ? priceToBps(znCurrent, znOpen)
      : (znDailyChg != null ? +(znDailyChg * 100).toFixed(2) : null);

    // ── MBB from Finnhub ───────────────────────────────────────────────────
    const mbbRaw     = fh['MBB'];
    const mbbCurrent = mbbRaw?.current || null;
    const mbbOpen    = mbbRaw?.open    || null;
    const mbbPrev    = mbbRaw?.prev    || null;
    // MBB change in bps from open (for regression delta-from-open)
    const mbbChangeBps = (mbbCurrent && mbbOpen) ? priceToBps(mbbCurrent, mbbOpen) : null;
    // MBB change from prior close (for display)
    const mbbChgFromClose = (mbbCurrent && mbbPrev) ? priceToBps(mbbCurrent, mbbPrev) : null;

    // ── MBS prices (MBS Live Firestore first, shadow fallback) ────────────
    // Prefer real MBS Live prices; fall back to shadow (regression-estimated)
    const u55Current    = safeFloat(fsMBS?.UMBS_5_5_Current)      || safeFloat(fsShadow?.UMBS_5_5_Shadow_Current);
    const u55Open       = safeFloat(fsMBS?.UMBS_5_5_Open)          || safeFloat(fsShadow?.UMBS_5_5_Shadow_Open);
    const u55High       = safeFloat(fsMBS?.UMBS_5_5_TodayHigh)     || safeFloat(fsShadow?.UMBS_5_5_Shadow_TodayHigh);
    const u55Low        = safeFloat(fsMBS?.UMBS_5_5_TodayLow)      || safeFloat(fsShadow?.UMBS_5_5_Shadow_TodayLow);
    const u55PriorClose = safeFloat(fsMBS?.UMBS_5_5_PriorDayClose) || safeFloat(fsShadow?.UMBS_5_5_Shadow_PriorDayClose);
    const u55DailyChg   = safeFloat(fsMBS?.UMBS_5_5_Daily_Change)  || safeFloat(fsShadow?.UMBS_5_5_Shadow_Daily_Change);
    // Convert daily change (price points) to bps: 1 point = 100 bps
    const u55ChangeBps  = u55DailyChg != null ? +(u55DailyChg * 100).toFixed(2)
                        : (u55Current && u55Open ? priceToBps(u55Current, u55Open) : null);

    const u60Current    = safeFloat(fsMBS?.UMBS_6_0_Current)      || safeFloat(fsShadow?.UMBS_6_0_Shadow_Current);
    const u60Open       = safeFloat(fsMBS?.UMBS_6_0_Open)          || safeFloat(fsShadow?.UMBS_6_0_Shadow_Open);
    const u60High       = safeFloat(fsMBS?.UMBS_6_0_TodayHigh)     || null;
    const u60Low        = safeFloat(fsMBS?.UMBS_6_0_TodayLow)      || null;
    const u60PriorClose = safeFloat(fsMBS?.UMBS_6_0_PriorDayClose) || safeFloat(fsShadow?.UMBS_6_0_Shadow_PriorDayClose);
    const u60DailyChg   = safeFloat(fsMBS?.UMBS_6_0_Daily_Change)  || safeFloat(fsShadow?.UMBS_6_0_Shadow_Daily_Change);
    const u60ChangeBps  = u60DailyChg != null ? +(u60DailyChg * 100).toFixed(2)
                        : (u60Current && u60Open ? priceToBps(u60Current, u60Open) : null);

    // MBS data source label for transparency
    const mbsSource = fsMBS?.UMBS_5_5_Current ? 'mbs_live' : (fsShadow?.UMBS_5_5_Shadow_Current ? 'shadow' : 'unavailable');

    // ── LockIQ Signal ──────────────────────────────────────────────────────
    const signal = computeSignal(us10yChangeBps, znChangeBps, mbbChangeBps);

    // ── FRED-sourced rates ─────────────────────────────────────────────────
    const obmmi30   = fred['OBMMIC30YF']?.latest   || null;
    const obmmi15   = fred['OBMMIC15YF']?.latest   || null;
    const obmmiFHA  = fred['OBMMIFHA30YF']?.latest || null;
    const obmmiVA   = fred['OBMMIVA30YF']?.latest  || null;
    const freddie30 = fred['MORTGAGE30US']?.latest || null;
    const freddie15 = fred['MORTGAGE15US']?.latest || null;

    // ── 2-10Y Spread ───────────────────────────────────────────────────────
    // Use FRED pre-computed T10Y2Y first, fallback to computing from DGS
    const t10y2yDirect = fred['T10Y2Y']?.latest || null;
    const dgs2         = fred['DGS2']?.latest   || null;
    const dgs10        = fred['DGS10']?.latest  || null;
    const spreadValue  = t10y2yDirect != null ? t10y2yDirect
                       : (dgs10 && dgs2 ? +(dgs10 - dgs2).toFixed(3) : null);
    // Convert to bps for display
    const spreadBps    = spreadValue != null ? +(spreadValue * 100).toFixed(0) : null;
    const spreadPrevBps = fred['T10Y2Y']?.prev != null ? +(fred['T10Y2Y'].prev * 100).toFixed(0) : null;
    const spreadChangeBps = (spreadBps != null && spreadPrevBps != null)
      ? spreadBps - spreadPrevBps : null;

    // ── Equities ───────────────────────────────────────────────────────────
    function buildEquity(symbol, indexName) {
      const r = fh[symbol];
      if (!r || r.error) return { symbol, indexName, error: r?.error || 'unavailable' };
      const mult = ETF_INDEX_MULT[symbol] || 1;
      return {
        symbol,
        indexName,
        etfPrice:   r.current,
        changePct:  r.changePct,
        change:     r.change,
        indexValue: r.current ? +(r.current * mult).toFixed(0) : null,
        open:       r.open,
        high:       r.high,
        low:        r.low,
        prevClose:  r.prev,
      };
    }

    const dow    = buildEquity('DIA', 'DOW');
    const nasdaq = buildEquity('QQQ', 'NASDAQ');
    const sp500  = buildEquity('SPY', 'S&P 500');

    // ── BTC ────────────────────────────────────────────────────────────────
    const btcRaw = fh['BINANCE:BTCUSDT'];
    const btc = btcRaw && !btcRaw.error ? {
      price:       btcRaw.current,
      open:        btcRaw.open,
      high:        btcRaw.high,
      low:         btcRaw.low,
      prevClose:   btcRaw.prev,
      priceChange: btcRaw.change ? +btcRaw.change.toFixed(0) : null,
      changePct:   btcRaw.changePct,
    } : null;

    // ── VIX ────────────────────────────────────────────────────────────────
    // VIXCLS from FRED is end-of-day only. Fine for this dashboard.
    const vixLatest = fred['VIXCLS']?.latest || null;
    const vixPrev   = fred['VIXCLS']?.prev   || null;
    const vixChange = (vixLatest && vixPrev) ? +((vixLatest - vixPrev).toFixed(2)) : null;

    // ── Broker rates (from Firestore, manually updated by Python app) ──────
    // Expected Firestore fields: conv30, conv15, fha30, va30, jumbo30, as_of
    const brokerRates = fsBrokerRates ? {
      conv30: safeFloat(fsBrokerRates.conv30),
      conv15: safeFloat(fsBrokerRates.conv15),
      fha30:  safeFloat(fsBrokerRates.fha30),
      va30:   safeFloat(fsBrokerRates.va30),
      jumbo30:safeFloat(fsBrokerRates.jumbo30),
      asOf:   fsBrokerRates.as_of ? fmtDate(fsBrokerRates.as_of) : null,
      source: 'firestore',
    } : null;

    // ── Fed Funds target (FRED + hardcoded current) ────────────────────────
    const fedFundsEffective = fred['FEDFUNDS']?.latest || null;
    // Hardcoded current FOMC target range — update after each FOMC decision
    const fedFundsTarget = '4.25–4.50%';

    // ── Legacy raw data (preserved for backward compat) ───────────────────
    const legacy_shadow = fsShadow ? {
      source: 'firestore',
      lastUpdated: fsShadow.last_updated || null,
      UMBS55: {
        current: u55Current, open: u55Open, priorClose: u55PriorClose,
        dailyChange: u55DailyChg, high: u55High, low: u55Low,
      },
      UMBS60: {
        current: u60Current, open: u60Open, priorClose: u60PriorClose,
        dailyChange: u60DailyChg,
      },
    } : { source: 'unavailable' };

    const legacy_liveYields = {
      source: fsUS10Y ? 'firestore' : 'fred',
      us10y: {
        current: us10yCurrent, open: us10yOpen, priorClose: us10yPriorClose,
        dailyChange: us10yDailyChg, high: us10yHigh, low: us10yLow,
        lastUpdated: fsUS10Y?.last_updated || null,
      },
      us30y: {
        current: safeFloat(fsUS30Y?.US30Y_Current) || fred['DGS30']?.latest || null,
        open: safeFloat(fsUS30Y?.US30Y_Open) || null,
        dailyChange: safeFloat(fsUS30Y?.US30Y_Daily_Change) || null,
      },
    };

    // ─────────────────────────────────────────────────────────────────────
    // RESPONSE
    // ─────────────────────────────────────────────────────────────────────
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({

        // ── Timestamp ──────────────────────────────────────────────────────
        timestamp: new Date().toISOString(),

        // ── LockIQ Signal ─────────────────────────────────────────────────
        // Used by signal hero in lockiq-beta.html
        signal: {
          state:      signal.state,        // 'SAFE' | 'WATCH' | 'CAUTION' | 'REPRICE LIKELY' | 'REPRICE CERTAIN'
          estMoveBps: signal.estMoveBps,   // estimated MBS move in bps (negative = adverse)
          adverseBps: signal.adverseBps,   // absolute adverse move (positive = bad)
          riskLabel:  signal.riskLabel,
          inputs:     signal.inputs,       // {d10yBps, dZNBps, dMBBBps}
          mbsSource,                       // 'mbs_live' | 'shadow' | 'unavailable'
        },

        // ── MBS tiles ─────────────────────────────────────────────────────
        umbs55: {
          price:          u55Current,
          open:           u55Open,
          high:           u55High,
          low:            u55Low,
          prevClose:      u55PriorClose,
          dailyChangePts: u55DailyChg,     // raw price points
          dailyChangeBps: u55ChangeBps,    // bps (pts × 100)
          source:         mbsSource,
        },
        umbs60: {
          price:          u60Current,
          open:           u60Open,
          high:           u60High,
          low:            u60Low,
          prevClose:      u60PriorClose,
          dailyChangePts: u60DailyChg,
          dailyChangeBps: u60ChangeBps,
          source:         mbsSource,
        },

        // ── Bond / Yield tiles ────────────────────────────────────────────
        us10y: {
          yield:      us10yCurrent,
          open:       us10yOpen,
          high:       us10yHigh,
          low:        us10yLow,
          prevClose:  us10yPriorClose,
          changeBps:  us10yChangeBps,      // bps from open (regression input)
          source:     fsUS10Y ? 'firestore' : 'fred',
          lastUpdated:fsUS10Y?.last_updated || null,
        },
        zn: {
          price:     znCurrent,
          open:      znOpen,
          high:      znHigh,
          low:       znLow,
          prevClose: znPriorClose,
          changeBps: znChangeBps,          // bps from open (regression input)
          source:    fsShadow?.ZN_Current ? 'firestore' : 'unavailable',
        },
        mbb: {
          price:          mbbCurrent,
          open:           mbbOpen,
          high:           mbbRaw?.high     || null,
          low:            mbbRaw?.low      || null,
          prevClose:      mbbPrev,
          changeBps:      mbbChangeBps,    // bps from open (regression input)
          chgFromCloseBps:mbbChgFromClose, // bps from prior close (for display)
          source:         'finnhub',
        },

        // ── Equities ──────────────────────────────────────────────────────
        // Frontend reads: dow, qqq, spx
        // Each has: changePct, indexValue (approx), etfPrice
        dow,
        qqq:   nasdaq,
        spx:   sp500,

        // ── Crypto ────────────────────────────────────────────────────────
        btc,

        // ── Macro ─────────────────────────────────────────────────────────
        vix: {
          price:  vixLatest,
          prev:   vixPrev,
          change: vixChange,
          source: 'fred_eod',           // end-of-day only
        },
        spread210: {
          value:     spreadValue,       // decimal (e.g. -0.18 = inverted 18 bps)
          valueBps:  spreadBps,         // integer bps (e.g. -18)
          change:    spreadChangeBps,   // bps change from prior observation
          source:    t10y2yDirect != null ? 'fred_t10y2y' : 'computed',
        },

        // ── Interest Rates ────────────────────────────────────────────────
        optimalBlue: {
          conv30: obmmi30,
          conv15: obmmi15,
          fha30:  obmmiFHA,
          va30:   obmmiVA,
          asOf:   fred['OBMMIC30YF']?.latestDate ? fmtDate(fred['OBMMIC30YF'].latestDate) : null,
          source: 'fred_obmmi',
        },
        brokerRates,                    // null if Firestore doc not yet created

        freddiePMMS: {
          conv30: freddie30,
          conv15: freddie15,
          asOf:   fred['MORTGAGE30US']?.latestDate ? fmtDate(fred['MORTGAGE30US'].latestDate) : null,
          source: 'fred_pmms',
        },

        fedFundsTarget,                 // hardcoded FOMC target range string
        fedFundsEffective,              // FRED FEDFUNDS latest observation

        // ── FOMC ──────────────────────────────────────────────────────────
        fomc: nextFomc(),

        // ── Meta ──────────────────────────────────────────────────────────
        meta: {
          finnhubLoaded:   finnhubResults.filter(r => !r.error).length,
          fredLoaded:      fredResults.filter(r => !r.error).length,
          firestoreLoaded: !!(fsShadow || fsUS10Y || fsMBS),
          mbsSource,
          signalState:     signal.state,
          brokerRatesLoaded: !!fsBrokerRates,
        },

        // ── Legacy fields (backward compat with existing lockiq.html) ─────
        shadow:      legacy_shadow,
        liveYields:  legacy_liveYields,
        realMBS:     fsMBS || null,
        fred,
        equities:    fh,
        yieldCurve: {
          source: 'FRED H.15', date: fred['DGS10']?.latestDate || null,
          y2: dgs2, y10: dgs10,
          y30: fred['DGS30']?.latest || null,
        },

      }),
    };

  } catch (e) {
    console.error('[getMarketData] handler error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }),
    };
  }
};

/*
═══════════════════════════════════════════════════════════════════════════════
OUTPUT SHAPE CONTRACT — lockiq-beta.html reads these top-level fields:

signal        → { state, estMoveBps, adverseBps, riskLabel, inputs, mbsSource }
umbs55        → { price, open, high, low, prevClose, dailyChangeBps }
umbs60        → { price, open, high, low, prevClose, dailyChangeBps }
us10y         → { yield, open, high, low, prevClose, changeBps }
zn            → { price, open, high, low, prevClose, changeBps }
mbb           → { price, open, high, low, prevClose, changeBps, chgFromCloseBps }
dow           → { etfPrice, changePct, indexValue }   (DIA × 100)
qqq           → { etfPrice, changePct, indexValue }   (QQQ × 40)
spx           → { etfPrice, changePct, indexValue }   (SPY × 10)
btc           → { price, open, high, low, prevClose, priceChange, changePct }
vix           → { price, change }
spread210     → { valueBps, change }
optimalBlue   → { conv30, conv15, fha30, va30, asOf }
brokerRates   → { conv30, conv15, fha30, va30, asOf }  ← null until Firestore doc created
freddiePMMS   → { conv30, conv15, asOf }
fedFundsTarget → "4.25–4.50%"

FIRESTORE DOCS REQUIRED:
  market_data/shadow_bonds   → ZN_Current, ZN_Open, ZN_Daily_Change, UMBS_5_5_Shadow_*
  market_data/us10y_current  → US10Y_Current, US10Y_Open, US10Y_Daily_Change
  market_data/us30y_current  → US30Y_Current, US30Y_Open
  market_data/mbs_products   → UMBS_5_5_Current, UMBS_5_5_Open, etc.
  market_data/broker_rates   → conv30, conv15, fha30, va30, jumbo30, as_of  ← CREATE THIS

ENV VARS REQUIRED:
  FINNHUB_API_KEY
  FRED_API_KEY
  FIREBASE_PROJECT_ID
  FIREBASE_CLIENT_EMAIL
  FIREBASE_PRIVATE_KEY
═══════════════════════════════════════════════════════════════════════════════
*/
