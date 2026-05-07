const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// ── Helpers ──────────────────────────────────────────────────────────────────

const num = (v) => {
  if (v === null || v === undefined || v === '' || v === 'N/A') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const delta = (cur, open) => {
  const c = num(cur);
  const o = num(open);
  if (c === null || o === null) return null;
  return Math.round((c - o) * 10000) / 10000;
};

const deltaBps = (cur, open) => {
  const c = num(cur);
  const o = num(open);
  if (c === null || o === null) return null;
  return Math.round((c - o) * 1000) / 10;
};

function todayAZ() {
  const now = new Date();
  const az  = new Date(now.getTime() - 7 * 60 * 60 * 1000);
  return az.toISOString().slice(0, 10);
}

// Extract latest value from a FRED series using all possible storage formats:
//   1. fred_cache nested object: { latest, latestDate, prev, change }
//   2. fred_cache flat value: 6.85
//   3. fred_history observations array: [{ date, value }, ...] — take last entry
function fredVal(cache, hist, key) {
  // Try cache first (fresher — written intraday by scheduled runs)
  const cacheObj = cache[key] ?? cache[key.toLowerCase()];
  if (cacheObj !== undefined && cacheObj !== null) {
    if (typeof cacheObj === 'object' && cacheObj.latest !== undefined) return num(cacheObj.latest);
    const flat = num(cacheObj);
    if (flat !== null) return flat;
  }
  // Fall back to fred_history (written at 4:30pm, always populated)
  const histObj = hist[key] ?? hist[key.toLowerCase()];
  if (histObj && Array.isArray(histObj.observations) && histObj.observations.length > 0) {
    const last = histObj.observations[histObj.observations.length - 1];
    return num(last.value);
  }
  return null;
}

// Latest date for a FRED series (for as_of display)
function fredDate(cache, hist, key) {
  const cacheObj = cache[key] ?? cache[key.toLowerCase()];
  if (cacheObj && typeof cacheObj === 'object' && cacheObj.latestDate) return cacheObj.latestDate;
  const histObj = hist[key] ?? hist[key.toLowerCase()];
  if (histObj && Array.isArray(histObj.observations) && histObj.observations.length > 0) {
    return histObj.observations[histObj.observations.length - 1].date;
  }
  return null;
}

// Week-over-week change for a FRED series
// Primary: fred_cache.change (computed by scraper)
// Fallback: last two observations from fred_history
function fredChange(cache, hist, key) {
  const cacheObj = cache[key] ?? cache[key.toLowerCase()];
  if (cacheObj && typeof cacheObj === 'object' && cacheObj.change !== undefined) {
    return num(cacheObj.change);
  }
  const histObj = hist[key] ?? hist[key.toLowerCase()];
  if (histObj && Array.isArray(histObj.observations) && histObj.observations.length >= 2) {
    const obs = histObj.observations;
    const latest = num(obs[obs.length - 1].value);
    const prev   = num(obs[obs.length - 2].value);
    if (latest !== null && prev !== null) return Math.round((latest - prev) * 10000) / 10000;
  }
  return null;
}

// Previous value for a FRED series
function fredPrev(cache, hist, key) {
  const cacheObj = cache[key] ?? cache[key.toLowerCase()];
  if (cacheObj && typeof cacheObj === 'object' && cacheObj.prev !== undefined) {
    return num(cacheObj.prev);
  }
  const histObj = hist[key] ?? hist[key.toLowerCase()];
  if (histObj && Array.isArray(histObj.observations) && histObj.observations.length >= 2) {
    const obs = histObj.observations;
    return num(obs[obs.length - 2].value);
  }
  return null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
  'Cache-Control':                'no-store',
};

// ── Handler ──────────────────────────────────────────────────────────────────

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }

  try {
    const today = todayAZ();

    const [
      mbsSnap, shadowSnap, us30ySnap, futuresSnap,
      brokerSnap, fredSnap, fredHistSnap, anchorSnap
    ] = await Promise.all([
      db.collection('market_data').doc('mbs_products').get(),
      db.collection('market_data').doc('shadow_bonds').get(),
      db.collection('market_data').doc('us30y_current').get(),
      db.collection('market_data').doc('treasury_futures').get(),
      db.collection('market_data').doc('broker_rates').get(),
      db.collection('market_data').doc('fred_cache').get(),
      db.collection('market_data').doc('fred_history').get(),
      db.collection('daily_anchors').doc(today).get(),
    ]);

    const mbs      = mbsSnap.exists      ? mbsSnap.data()      : {};
    const shadow   = shadowSnap.exists   ? shadowSnap.data()   : {};
    const us30y    = us30ySnap.exists    ? us30ySnap.data()    : {};
    const futures  = futuresSnap.exists  ? futuresSnap.data()  : {};
    const broker   = brokerSnap.exists   ? brokerSnap.data()   : {};
    const fred     = fredSnap.exists     ? fredSnap.data()     : {};
    const fredHist = fredHistSnap.exists ? fredHistSnap.data() : {};
    const anchor   = anchorSnap.exists   ? anchorSnap.data()   : {};

    // ── MBS Products ─────────────────────────────────────────────────────────
    const mbsProducts = {
      umbs50_price: num(mbs.UMBS_5_0_Current),
      umbs50_open:  num(mbs.UMBS_5_0_Open),
      umbs50_delta: delta(mbs.UMBS_5_0_Current, mbs.UMBS_5_0_Open),

      umbs55_price: num(mbs.UMBS_5_5_Current),
      umbs55_open:  num(mbs.UMBS_5_5_Open),
      umbs55_delta: delta(mbs.UMBS_5_5_Current, mbs.UMBS_5_5_Open),

      umbs60_price: num(mbs.UMBS_6_0_Current),
      umbs60_open:  num(mbs.UMBS_6_0_Open),
      umbs60_delta: delta(mbs.UMBS_6_0_Current, mbs.UMBS_6_0_Open),

      gnma50_price: num(mbs.GNMA_5_0_Current),
      gnma50_open:  num(mbs.GNMA_5_0_Open),
      gnma50_delta: delta(mbs.GNMA_5_0_Current, mbs.GNMA_5_0_Open),

      gnma55_price: num(mbs.GNMA_5_5_Current),
      gnma55_open:  num(mbs.GNMA_5_5_Open),
      gnma55_delta: delta(mbs.GNMA_5_5_Current, mbs.GNMA_5_5_Open),

      gnma60_price: num(mbs.GNMA_6_0_Current),
      gnma60_open:  num(mbs.GNMA_6_0_Open),
      gnma60_delta: delta(mbs.GNMA_6_0_Current, mbs.GNMA_6_0_Open),

      last_updated:     mbs.last_updated     || null,
      trading_day_date: mbs.trading_day_date || null,
    };

    // ── Shadow Bonds ─────────────────────────────────────────────────────────
    const shadowBonds = {
      us10y_current: num(shadow.US10Y_Current),
      us10y_open:    num(shadow.US10Y_Open),
      us10y_delta:   deltaBps(shadow.US10Y_Current, shadow.US10Y_Open),

      mbb_current: num(shadow.MBB_Current),
      mbb_open:    num(shadow.MBB_Open),
      mbb_delta:   delta(shadow.MBB_Current, shadow.MBB_Open),

      predicted_umbs55_delta: num(shadow.predicted_umbs55_delta)
                           ?? num(shadow.regression_predicted_umbs55_delta)
                           ?? null,

      last_updated:     shadow.last_updated     || null,
      trading_day_date: shadow.trading_day_date || null,
    };

    // ── US 30Y ────────────────────────────────────────────────────────────────
    const us30yData = {
      us30y_current: num(us30y.US30Y_Current),
      us30y_open:    num(us30y.US30Y_Open),
      us30y_delta:   deltaBps(us30y.US30Y_Current, us30y.US30Y_Open),
      last_updated:  us30y.last_updated || null,
    };

    // ── Treasury Futures ──────────────────────────────────────────────────────
    const treasuryFutures = {
      zn_current: num(futures.ZN1_Current),
      zn_open:    num(futures.ZN1_Open),
      zn_delta:   delta(futures.ZN1_Current, futures.ZN1_Open),

      zb_current: num(futures.ZB1_Current),
      zb_open:    num(futures.ZB1_Open),
      zb_delta:   delta(futures.ZB1_Current, futures.ZB1_Open),

      zf_current: num(futures.ZF1_Current),
      zf_open:    num(futures.ZF1_Open),
      zf_delta:   delta(futures.ZF1_Current, futures.ZF1_Open),

      zt_current: num(futures.ZT1_Current),
      zt_open:    num(futures.ZT1_Open),
      zt_delta:   delta(futures.ZT1_Current, futures.ZT1_Open),

      last_updated:     futures.last_updated     || null,
      trading_day_date: futures.trading_day_date || null,
    };

    // ── Broker Rates ──────────────────────────────────────────────────────────
    const brokerRates = {
      conv30:    num(broker.conv30),
      conv15:    num(broker.conv15),
      fha30:     num(broker.fha30),
      va30:      num(broker.va30),
      jumbo30:   num(broker.jumbo30),
      cashout30: num(broker.cashout30),
      inv30:     num(broker.inv30),
      as_of:     broker.as_of || null,
    };

    // ── FRED Rates ────────────────────────────────────────────────────────────
    // Primary: fred_cache (intraday scheduled writes)
    // Fallback: fred_history observations array (written 4:30pm daily, always populated)
    const fv = (key) => fredVal(fred, fredHist, key);
    const fd = (key) => fredDate(fred, fredHist, key);
    const fc = (key) => fredChange(fred, fredHist, key);
    const fp = (key) => fredPrev(fred, fredHist, key);

    const fredCache = {
      // ── Optimal Blue ──────────────────────────────────────
      obmmic30yf:            fv('OBMMIC30YF'),
      obmmic30yf_prev:       fp('OBMMIC30YF'),
      obmmic30yf_change:     fc('OBMMIC30YF'),
      obmmic30yf_date:       fd('OBMMIC30YF'),

      obmmic15yf:            fv('OBMMIC15YF'),
      obmmic15yf_prev:       fp('OBMMIC15YF'),
      obmmic15yf_change:     fc('OBMMIC15YF'),
      obmmic15yf_date:       fd('OBMMIC15YF'),

      obmmifha30yf:          fv('OBMMIFHA30YF'),
      obmmifha30yf_prev:     fp('OBMMIFHA30YF'),
      obmmifha30yf_change:   fc('OBMMIFHA30YF'),
      obmmifha30yf_date:     fd('OBMMIFHA30YF'),

      obmmiva30yf:           fv('OBMMIVA30YF'),
      obmmiva30yf_prev:      fp('OBMMIVA30YF'),
      obmmiva30yf_change:    fc('OBMMIVA30YF'),
      obmmiva30yf_date:      fd('OBMMIVA30YF'),

      obmmijumbo30yf:        fv('OBMMIJUMBO30YF'),
      obmmijumbo30yf_prev:   fp('OBMMIJUMBO30YF'),
      obmmijumbo30yf_change: fc('OBMMIJUMBO30YF'),
      obmmijumbo30yf_date:   fd('OBMMIJUMBO30YF'),

      // ── Freddie Mac PMMS ────────────────────────────────────
      mortgage30us:          fv('MORTGAGE30US'),
      mortgage30us_prev:     fp('MORTGAGE30US'),
      mortgage30us_change:   fc('MORTGAGE30US'),
      mortgage30us_date:     fd('MORTGAGE30US'),

      mortgage15us:          fv('MORTGAGE15US'),
      mortgage15us_prev:     fp('MORTGAGE15US'),
      mortgage15us_change:   fc('MORTGAGE15US'),
      mortgage15us_date:     fd('MORTGAGE15US'),

      as_of: fred.last_updated || fred.as_of || fred.fetched_at || null,
    };

    // ── Daily Anchor ──────────────────────────────────────────────────────────
    const dailyAnchor = anchorSnap.exists ? {
      open_umbs55: num(anchor.open_umbs55),
      open_zn:     num(anchor.open_zn),
      open_10y:    num(anchor.open_10y),
      am_brief:    anchor.am_brief    || null,
      lock_signal: anchor.lock_signal || null,
      created_at:  anchor.created_at  || null,
    } : null;

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        fetchedAt: new Date().toISOString(),
        date:      today,
        mbsProducts,
        shadowBonds,
        us30y:     us30yData,
        treasuryFutures,
        brokerRates,
        fredCache,
        dailyAnchor,
      }),
    };

  } catch (err) {
    console.error('getMarketData error:', err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
