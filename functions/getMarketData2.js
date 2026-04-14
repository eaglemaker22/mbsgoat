// functions/getMarketData.js
// Feeds lockiq-beta.html with all required data fields.
// Output shape contract is documented at bottom of this file.
//
// FRED data is now read from Firestore market_data/fred_cache
// (written by lockiq_FRED.py scraper on Windows machine).
// Falls back to direct FRED API calls if cache is missing or >24hrs old.

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
const FINNHUB_EQUITIES = ['DIA', 'QQQ', 'SPY'];
const FINNHUB_OTHER    = ['MBB', 'BINANCE:BTCUSDT'];
const ETF_INDEX_MULT   = { DIA: 100, QQQ: 40, SPY: 10 };

// ── FRED SERIES (fallback only) ───────────────────────────────────────────────
const FRED_SERIES = [
  'OBMMIC30YF',
  'OBMMIC15YF',
  'OBMMIFHA30YF',
  'OBMMIVA30YF',
  'MORTGAGE30US',
  'MORTGAGE15US',
  'DGS2',
  'DGS10',
  'DGS30',
  'T10Y2Y',
  'FEDFUNDS',
];

// ── FOMC DATES ───────────────────────────────────────────────────────────────
const FOMC_DATES = [
  '2026-04-30', '2026-06-17', '2026-07-29', '2026-09-16',
  '2026-11-04', '2026-12-16',
];

// ── REGRESSION CONSTANTS ─────────────────────────────────────────────────────
const REG = { b10y: -2.387, bZN: 0.069, bMBB: 0.122 };

// ── REPRICE THRESHOLDS (bps adverse) ─────────────────────────────────────────
const THRESHOLDS = { safe: 15, watch: 25, caution: 40, reprice: 62 };

// ── FRED CACHE TTL ────────────────────────────────────────────────────────────
const FRED_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

function priceToBps(current, open) {
  if (!current || !open || open === 0) return null;
  return +((current - open) / open * 10000).toFixed(2);
}

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
    const current   = parseFloat(q.c);
    const prev      = parseFloat(q.pc);
    const open      = parseFloat(q.o) || null;
    const change    = current - prev;
    const changePct = prev !== 0 ? (change / prev) * 100 : 0;
    return {
      symbol,
      current:   +current.toFixed(3),
      prev:      +prev.toFixed(3),
      open:      open ? +open.toFixed(3) : null,
      high:      q.h ? +parseFloat(q.h).toFixed(3) : null,
      low:       q.l ? +parseFloat(q.l).toFixed(3)  : null,
      change:    +change.toFixed(3),
      changePct: +changePct.toFixed(3),
      timestamp: q.t || null,
    };
  } catch (e) {
    return { symbol, error: e.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FRED (direct API — fallback only)
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
      latest:     vals[0].value,
      latestDate: vals[0].date,
      prev:       vals[1]?.value || null,
      prevDate:   vals[1]?.date  || null,
      change:     vals[1] ? +((vals[0].value - vals[1].value).toFixed(4)) : null,
      trend,
      history:    vals,
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
    const now     = Math.floor(Date.now() / 1000);
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
          'Content-Type':  'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
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
    if      (v.stringValue   !== undefined) out[k] = v.stringValue;
    else if (v.doubleValue   !== undefined) out[k] = v.doubleValue;
    else if (v.integerValue  !== undefined) out[k] = parseInt(v.integerValue);
    else if (v.booleanValue  !== undefined) out[k] = v.booleanValue;
    else if (v.timestampValue !== undefined) out[k] = v.timestampValue;
    else if (v.nullValue     !== undefined) out[k] = null;
    else if (v.mapValue      !== undefined) out[k] = flattenFirestore(v.mapValue.fields || {});
  }
  return out;
}

async function fetchFirestoreDoc(token, collection, doc) {
  if (!FB_PROJECT || !token) return null;
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents/${collection}/${doc}`;
    return new Promise((resolve) => {
      const req = https.request(url, {
        method:  'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
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
// FRED CACHE LOGIC
// ─────────────────────────────────────────────────────────────────────────────

// Convert Firestore fred_cache doc into the same shape as fetchFredSeries results
// so the rest of the handler code doesn't need to change.
function buildFredFromCache(cache) {
  const fred = {};
  const SERIES = [
    'OBMMIC30YF', 'OBMMIC15YF', 'OBMMIFHA30YF', 'OBMMIVA30YF',
    'MORTGAGE30US', 'MORTGAGE15US', 'DGS2', 'DGS10', 'DGS30',
    'T10Y2Y', 'FEDFUNDS',
  ];
  for (const id of SERIES) {
    const cached = cache[id];
    if (cached && cached.latest != null) {
      fred[id] = {
        seriesId:   id,
        latest:     cached.latest,
        latestDate: cached.latestDate || null,
        prev:       cached.prev       || null,
        prevDate:   cached.prevDate   || null,
        change:     cached.change     || null,
        source:     'firestore_cache',
      };
    }
  }
  return fred;
}

function isCacheFresh(cache) {
  if (!cache || !cache.last_updated) return false;
  try {
    const cacheTime = new Date(cache.last_updated).getTime();
    return (Date.now() - cacheTime) < FRED_CACHE_TTL_MS;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────

function computeSignal(d10yBps, dZNBps, dMBBBps) {
  const d10y    = d10yBps || 0;
  const dZN     = dZNBps  || 0;
  const dMBB    = dMBBBps || 0;
  const estMove = (REG.b10y * d10y) + (REG.bZN * dZN) + (REG.bMBB * dMBB);
  const adverse = -estMove;

  let state, riskLabel;
  if      (adverse <= THRESHOLDS.safe)    { state = 'SAFE';            riskLabel = 'No reprice risk'; }
  else if (adverse <= THRESHOLDS.watch)   { state = 'WATCH';           riskLabel = `Near-par ${adverse.toFixed(1)} bps`; }
  else if (adverse <= THRESHOLDS.caution) { state = 'CAUTION';         riskLabel = `Near-par ${adverse.toFixed(1)} bps`; }
  else if (adverse <= THRESHOLDS.reprice) { state = 'REPRICE LIKELY';  riskLabel = `Above-par ${adverse.toFixed(1)} bps`; }
  else                                    { state = 'REPRICE CERTAIN'; riskLabel = `DANGER ${adverse.toFixed(1)} bps`; }

  return {
    state,
    estMoveBps: +estMove.toFixed(2),
    adverseBps: +adverse.toFixed(2),
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
    const allFinnhubSymbols = [...FINNHUB_EQUITIES, ...FINNHUB_OTHER];

    // ── Get Firebase token once, reuse for all Firestore calls ────────────
    const fbToken = await getFirebaseToken();
    const fsGet = (collection, doc) => fetchFirestoreDoc(fbToken, collection, doc);

    // ── Parallel fetch — Finnhub + all Firestore docs ─────────────────────
    const [
      finnhubResults,
      fsShadow,
      fsUS10Y,
      fsUS30Y,
      fsMBS,
      fsBrokerRates,
      fsFredCache,
    ] = await Promise.all([
      batchAll(allFinnhubSymbols, fetchFinnhub, 5),
      fsGet('market_data', 'shadow_bonds'),
      fsGet('market_data', 'us10y_current'),
      fsGet('market_data', 'us30y_current'),
      fsGet('market_data', 'mbs_products'),
      fsGet('market_data', 'broker_rates'),
      fsGet('market_data', 'fred_cache'),
    ]);

    // ── FRED: use Firestore cache if fresh, else fall back to direct API ──
    let fred = {};
    let fredSource = 'none';

    if (fsFredCache && isCacheFresh(fsFredCache)) {
      fred = buildFredFromCache(fsFredCache);
      fredSource = 'firestore_cache';
      console.log('[FRED] Using Firestore cache, last_updated:', fsFredCache.last_updated);
    } else {
      console.log('[FRED] Cache missing or stale — falling back to direct FRED API calls.');
      const fredResults = FRED_KEY
        ? await batchAll(FRED_SERIES, fetchFredSeries, 5)
        : [];
      fredResults.forEach(r => { if (r.seriesId) fred[r.seriesId] = r; });
      fredSource = 'fred_api_fallback';
    }

    // Index Finnhub results
    const fh = {};
    finnhubResults.forEach(r => { fh[r.symbol] = r; });

    // ── 10Y yield ─────────────────────────────────────────────────────────
    const us10yCurrent    = safeFloat(fsUS10Y?.US10Y_Current)      || fred['DGS10']?.latest   || null;
    const us10yOpen       = safeFloat(fsUS10Y?.US10Y_Open)          || null;
    const us10yPriorClose = safeFloat(fsUS10Y?.US10Y_PriorDayClose) || null;
    const us10yHigh       = safeFloat(fsUS10Y?.US10Y_TodayHigh)     || null;
    const us10yLow        = safeFloat(fsUS10Y?.US10Y_TodayLow)      || null;
    const us10yDailyChg   = safeFloat(fsUS10Y?.US10Y_Daily_Change)  || null;

    const us10yChangeBps = us10yDailyChg != null
      ? +(us10yDailyChg * 100).toFixed(2)
      : (us10yCurrent && us10yOpen ? +((us10yCurrent - us10yOpen) * 100).toFixed(2) : null);

    // ── ZN ────────────────────────────────────────────────────────────────
    const znCurrent    = safeFloat(fsShadow?.ZN1_Current);
    const znOpen       = safeFloat(fsShadow?.ZN1_Open);
    const znPriorClose = safeFloat(fsShadow?.ZN1_PriorDayClose);
    const znHigh       = safeFloat(fsShadow?.ZN1_TodayHigh);
    const znLow        = safeFloat(fsShadow?.ZN1_TodayLow);
    const znDailyChg   = safeFloat(fsShadow?.ZN1_Daily_Change);
    const znChangeBps  = (znCurrent && znOpen)
      ? priceToBps(znCurrent, znOpen)
      : (znDailyChg != null ? +(znDailyChg * 100).toFixed(2) : null);

    // ── MBB ───────────────────────────────────────────────────────────────
    const mbbRaw          = fh['MBB'];
    const mbbCurrent      = mbbRaw?.current || null;
    const mbbOpen         = mbbRaw?.open    || null;
    const mbbPrev         = mbbRaw?.prev    || null;
    const mbbChangeBps    = (mbbCurrent && mbbOpen) ? priceToBps(mbbCurrent, mbbOpen) : null;
    const mbbChgFromClose = (mbbCurrent && mbbPrev) ? priceToBps(mbbCurrent, mbbPrev) : null;

    // ── MBS prices ────────────────────────────────────────────────────────
    const u55Current    = safeFloat(fsMBS?.UMBS_5_5_Current)      || safeFloat(fsShadow?.UMBS_5_5_Shadow_Current);
    const u55Open       = safeFloat(fsMBS?.UMBS_5_5_Open)          || safeFloat(fsShadow?.UMBS_5_5_Shadow_Open);
    const u55High       = safeFloat(fsMBS?.UMBS_5_5_TodayHigh)     || safeFloat(fsShadow?.UMBS_5_5_Shadow_TodayHigh);
    const u55Low        = safeFloat(fsMBS?.UMBS_5_5_TodayLow)      || safeFloat(fsShadow?.UMBS_5_5_Shadow_TodayLow);
    const u55PriorClose = safeFloat(fsMBS?.UMBS_5_5_PriorDayClose) || safeFloat(fsShadow?.UMBS_5_5_Shadow_PriorDayClose);
    const u55DailyChg   = safeFloat(fsMBS?.UMBS_5_5_Daily_Change)  || safeFloat(fsShadow?.UMBS_5_5_Shadow_Daily_Change);
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

    const mbsSource = fsMBS?.UMBS_5_5_Current ? 'mbs_live' : (fsShadow?.UMBS_5_5_Shadow_Current ? 'shadow' : 'unavailable');

    // ── Signal ────────────────────────────────────────────────────────────
    const signal = computeSignal(us10yChangeBps, znChangeBps, mbbChangeBps);

    // ── FRED-sourced rates ────────────────────────────────────────────────
    const obmmi30   = fred['OBMMIC30YF']?.latest   || null;
    const obmmi15   = fred['OBMMIC15YF']?.latest   || null;
    const obmmiFHA  = fred['OBMMIFHA30YF']?.latest || null;
    const obmmiVA   = fred['OBMMIVA30YF']?.latest  || null;
    const freddie30 = fred['MORTGAGE30US']?.latest || null;
    const freddie15 = fred['MORTGAGE15US']?.latest || null;

    // ── 2-10Y Spread ──────────────────────────────────────────────────────
    const t10y2yDirect  = fred['T10Y2Y']?.latest || null;
    const dgs2          = fred['DGS2']?.latest   || null;
    const dgs10         = fred['DGS10']?.latest  || null;
    const spreadValue   = t10y2yDirect != null ? t10y2yDirect
                        : (dgs10 && dgs2 ? +(dgs10 - dgs2).toFixed(3) : null);
    const spreadBps     = spreadValue != null ? +(spreadValue * 100).toFixed(0) : null;
    const spreadPrevBps = fred['T10Y2Y']?.prev != null ? +(fred['T10Y2Y'].prev * 100).toFixed(0) : null;
    const spreadChangeBps = (spreadBps != null && spreadPrevBps != null)
      ? spreadBps - spreadPrevBps : null;

    // ── Equities ──────────────────────────────────────────────────────────
    function buildEquity(symbol, indexName) {
      const r = fh[symbol];
      if (!r || r.error) return { symbol, indexName, error: r?.error || 'unavailable' };
      const mult = ETF_INDEX_MULT[symbol] || 1;
      return {
        symbol, indexName,
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

    const dow   = buildEquity('DIA', 'DOW');
    const nasdaq = buildEquity('QQQ', 'NASDAQ');
    const sp500  = buildEquity('SPY', 'S&P 500');

    // ── BTC ───────────────────────────────────────────────────────────────
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

    // ── VIX ───────────────────────────────────────────────────────────────
    const vixLatest = fred['VIXCLS']?.latest || null;
    const vixPrev   = fred['VIXCLS']?.prev   || null;
    const vixChange = (vixLatest && vixPrev) ? +((vixLatest - vixPrev).toFixed(2)) : null;

    // ── Broker rates ──────────────────────────────────────────────────────
    const brokerRates = fsBrokerRates ? {
      conv30:  safeFloat(fsBrokerRates.conv30),
      conv15:  safeFloat(fsBrokerRates.conv15),
      fha30:   safeFloat(fsBrokerRates.fha30),
      va30:    safeFloat(fsBrokerRates.va30),
      jumbo30: safeFloat(fsBrokerRates.jumbo30),
      asOf:    fsBrokerRates.as_of ? fmtDate(fsBrokerRates.as_of) : null,
      source:  'firestore',
    } : null;

    // ── Fed Funds ─────────────────────────────────────────────────────────
    const fedFundsEffective = fred['FEDFUNDS']?.latest || null;
    const fedFundsTarget    = '4.25–4.50%';

    // ── Legacy fields ─────────────────────────────────────────────────────
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

        timestamp: new Date().toISOString(),

        signal: {
          state:      signal.state,
          estMoveBps: signal.estMoveBps,
          adverseBps: signal.adverseBps,
          riskLabel:  signal.riskLabel,
          inputs:     signal.inputs,
          mbsSource,
        },

        umbs55: {
          price:          u55Current,
          open:           u55Open,
          high:           u55High,
          low:            u55Low,
          prevClose:      u55PriorClose,
          dailyChangePts: u55DailyChg,
          dailyChangeBps: u55ChangeBps,
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

        us10y: {
          yield:       us10yCurrent,
          open:        us10yOpen,
          high:        us10yHigh,
          low:         us10yLow,
          prevClose:   us10yPriorClose,
          changeBps:   us10yChangeBps,
          source:      fsUS10Y ? 'firestore' : 'fred',
          lastUpdated: fsUS10Y?.last_updated || null,
        },
        zn: {
          price:     znCurrent,
          open:      znOpen,
          high:      znHigh,
          low:       znLow,
          prevClose: znPriorClose,
          changeBps: znChangeBps,
          source:    fsShadow?.ZN1_Current ? 'firestore' : 'unavailable',
        },
        mbb: {
          price:           mbbCurrent,
          open:            mbbOpen,
          high:            mbbRaw?.high  || null,
          low:             mbbRaw?.low   || null,
          prevClose:       mbbPrev,
          changeBps:       mbbChangeBps,
          chgFromCloseBps: mbbChgFromClose,
          source:          'finnhub',
        },

        dow,
        qqq:  nasdaq,
        spx:  sp500,

        btc,

        vix: {
          price:  vixLatest,
          prev:   vixPrev,
          change: vixChange,
          source: 'fred_eod',
        },
        spread210: {
          value:    spreadValue,
          valueBps: spreadBps,
          change:   spreadChangeBps,
          source:   t10y2yDirect != null ? 'fred_t10y2y' : 'computed',
        },

        optimalBlue: {
          conv30: obmmi30,
          conv15: obmmi15,
          fha30:  obmmiFHA,
          va30:   obmmiVA,
          asOf:   fred['OBMMIC30YF']?.latestDate ? fmtDate(fred['OBMMIC30YF'].latestDate) : null,
          source: fredSource,
        },
        brokerRates,

        freddiePMMS: {
          conv30: freddie30,
          conv15: freddie15,
          asOf:   fred['MORTGAGE30US']?.latestDate ? fmtDate(fred['MORTGAGE30US'].latestDate) : null,
          source: fredSource,
        },

        fedFundsTarget,
        fedFundsEffective,

        fomc: nextFomc(),

        meta: {
          finnhubLoaded:     finnhubResults.filter(r => !r.error).length,
          fredSource,
          fredCacheAge:      fsFredCache?.last_updated || null,
          firestoreLoaded:   !!(fsShadow || fsUS10Y || fsMBS),
          mbsSource,
          signalState:       signal.state,
          brokerRatesLoaded: !!fsBrokerRates,
        },

        // Legacy
        shadow:     legacy_shadow,
        liveYields: legacy_liveYields,
        realMBS:    fsMBS || null,
        fred,
        equities:   fh,
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
dow           → { etfPrice, changePct, indexValue }
qqq           → { etfPrice, changePct, indexValue }
spx           → { etfPrice, changePct, indexValue }
btc           → { price, open, high, low, prevClose, priceChange, changePct }
vix           → { price, change }
spread210     → { valueBps, change }
optimalBlue   → { conv30, conv15, fha30, va30, asOf }
brokerRates   → { conv30, conv15, fha30, va30, jumbo30, asOf }
freddiePMMS   → { conv30, conv15, asOf }
fedFundsTarget → "4.25–4.50%"

FIRESTORE DOCS REQUIRED:
  market_data/shadow_bonds   → ZN1_Current, ZN1_Open, ZN1_Daily_Change
  market_data/us10y_current  → US10Y_Current, US10Y_Open, US10Y_Daily_Change
  market_data/us30y_current  → US30Y_Current, US30Y_Open
  market_data/mbs_products   → UMBS_5_5_Current, UMBS_5_5_Open, etc.
  market_data/broker_rates   → conv30, conv15, fha30, va30, jumbo30, as_of
  market_data/fred_cache     → written by lockiq_FRED.py scraper

ENV VARS REQUIRED:
  FINNHUB_API_KEY
  FRED_API_KEY         (fallback only)
  FIREBASE_PROJECT_ID
  FIREBASE_CLIENT_EMAIL
  FIREBASE_PRIVATE_KEY
═══════════════════════════════════════════════════════════════════════════════
*/
