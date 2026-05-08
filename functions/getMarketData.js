// v2.1 — shaped UI blocks, BPI prev/open change tracking
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
      brokerSnap, brokerPrevSnap, brokerOpenSnap,
      fredSnap, fredHistSnap, anchorSnap
    ] = await Promise.all([
      db.collection('market_data').doc('mbs_products').get(),
      db.collection('market_data').doc('shadow_bonds').get(),
      db.collection('market_data').doc('us30y_current').get(),
      db.collection('market_data').doc('treasury_futures').get(),
      db.collection('market_data').doc('broker_rates').get(),
      db.collection('market_data').doc('broker_rates_prev').get(),
      db.collection('market_data').doc('broker_rates_open').get(),
      db.collection('market_data').doc('fred_cache').get(),
      db.collection('market_data').doc('fred_history').get(),
      db.collection('daily_anchors').doc(today).get(),
    ]);

    const mbs        = mbsSnap.exists        ? mbsSnap.data()        : {};
    const shadow     = shadowSnap.exists     ? shadowSnap.data()     : {};
    const us30y      = us30ySnap.exists      ? us30ySnap.data()      : {};
    const futures    = futuresSnap.exists    ? futuresSnap.data()    : {};
    const broker     = brokerSnap.exists     ? brokerSnap.data()     : {};
    const brokerPrev = brokerPrevSnap.exists ? brokerPrevSnap.data() : {};
    const brokerOpen = brokerOpenSnap.exists ? brokerOpenSnap.data() : {};
    const fred       = fredSnap.exists       ? fredSnap.data()       : {};
    const fredHist   = fredHistSnap.exists   ? fredHistSnap.data()   : {};
    const anchor     = anchorSnap.exists     ? anchorSnap.data()     : {};

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

      gnma50_price:  num(mbs.GNMA_5_0_Current),
      gnma50_open:   num(mbs.GNMA_5_0_Open),
      gnma50_delta:  delta(mbs.GNMA_5_0_Current, mbs.GNMA_5_0_Open),
      gnma50_spread: num(mbs.GNMA_5_0_vs_UMBS_5_0_spread),

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
      const shadowBonds = {
        us10y_current: num(shadow.US10Y_Current),
        us10y_open:    num(shadow.US10Y_Open),
        us10y_delta:   deltaBps(shadow.US10Y_Current, shadow.US10Y_Open),

        us2y_current: num(shadow.US2Y_Current),
        us2y_open:    num(shadow.US2Y_Open),
        us2y_delta:   deltaBps(shadow.US2Y_Current, shadow.US2Y_Open),

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

    // ── Shaped UI blocks ─────────────────────────────────────────────────────
    // These are the clean, named objects that HTML pages consume directly.
    // getMarketData.js is the adapter layer — Firestore structure stays internal.

    // freddie: Freddie Mac PMMS — rates.html freddiePanel
    const freddie = {
      rates: [
        {
          product: '30Y FIXED',
          rate:     fv('MORTGAGE30US'),
          prev:     fp('MORTGAGE30US'),
          change:   fc('MORTGAGE30US'),
        },
        {
          product: '15Y FIXED',
          rate:     fv('MORTGAGE15US'),
          prev:     fp('MORTGAGE15US'),
          change:   fc('MORTGAGE15US'),
        },
      ].filter(r => r.rate !== null),
      as_of: fd('MORTGAGE30US') || fred.last_updated || null,
    };

    // mcr: OBMMI / Optimal Blue Market Composite — rates.html mcrPanel
    const mcr = {
      rates: [
        {product: '30Y CONV',  rate: fv('OBMMIC30YF'),     prev: fp('OBMMIC30YF'),     change: fc('OBMMIC30YF')},
        {product: '30Y FHA',   rate: fv('OBMMIFHA30YF'),   prev: fp('OBMMIFHA30YF'),   change: fc('OBMMIFHA30YF')},
        {product: '30Y VA',    rate: fv('OBMMIVA30YF'),    prev: fp('OBMMIVA30YF'),    change: fc('OBMMIVA30YF')},
        {product: '30Y JUMBO', rate: fv('OBMMIJUMBO30YF'), prev: fp('OBMMIJUMBO30YF'), change: fc('OBMMIJUMBO30YF')},
        {product: '15Y CONV',  rate: fv('OBMMIC15YF'),     prev: fp('OBMMIC15YF'),     change: fc('OBMMIC15YF')},
      ].filter(r => r.rate !== null),
      as_of: fd('OBMMIC30YF') || fred.last_updated || null,
    };

    // bpi: Broker Price Index — rates.html bpiPanelA + bpiPanelB
    // Option A = best-qualified borrower (760 FICO, 75 LTV)
    // Option B = actual B-paper scenario (720 FICO, 80 LTV) from broker_rates _b fields
    //
    // change   = day-over-day: broker_rates vs broker_rates_prev (written by run_all.py)
    // change_intraday = same-day: broker_rates vs broker_rates_open (first run of day)
    const bpiDiff = (cur, prev) => {
      const c = num(cur), p = num(prev);
      if (c === null || p === null) return null;
      return Math.round((c - p) * 1000) / 1000;
    };

    const bpiRates = [
      {
        product: '30Y CONV',
        rate:            num(broker.conv30),
        change:          bpiDiff(broker.conv30,    brokerPrev.conv30),
        change_intraday: bpiDiff(broker.conv30,    brokerOpen.conv30),
      },
      {
        product: '30Y FHA',
        rate:            num(broker.fha30),
        change:          bpiDiff(broker.fha30,     brokerPrev.fha30),
        change_intraday: bpiDiff(broker.fha30,     brokerOpen.fha30),
      },
      {
        product: '30Y VA',
        rate:            num(broker.va30),
        change:          bpiDiff(broker.va30,      brokerPrev.va30),
        change_intraday: bpiDiff(broker.va30,      brokerOpen.va30),
      },
      {
        product: '30Y JUMBO',
        rate:            num(broker.jumbo30),
        change:          bpiDiff(broker.jumbo30,   brokerPrev.jumbo30),
        change_intraday: bpiDiff(broker.jumbo30,   brokerOpen.jumbo30),
        tag: 'JUMBO',
      },
      {
        product: '15Y CONV',
        rate:            num(broker.conv15),
        change:          bpiDiff(broker.conv15,    brokerPrev.conv15),
        change_intraday: bpiDiff(broker.conv15,    brokerOpen.conv15),
      },
      {
        product: '30Y CASHOUT',
        rate:            num(broker.cashout30),
        change:          bpiDiff(broker.cashout30, brokerPrev.cashout30),
        change_intraday: bpiDiff(broker.cashout30, brokerOpen.cashout30),
        tag: 'CASHOUT',
      },
      {
        product: '30Y INVEST',
        rate:            num(broker.inv30),
        change:          bpiDiff(broker.inv30,     brokerPrev.inv30),
        change_intraday: bpiDiff(broker.inv30,     brokerOpen.inv30),
        tag: 'INVEST',
      },
    ].filter(r => r.rate !== null);

    // B-paper: use actual parsed _b fields; fall back to A + 0.250 if not yet available
    const bpiRates_b = [
      {product: '30Y CONV',    rate: num(broker.conv30_b)    ?? (num(broker.conv30)    !== null ? +(num(broker.conv30)    + 0.250).toFixed(3) : null), change: bpiDiff(broker.conv30_b,    brokerPrev.conv30_b),    change_intraday: bpiDiff(broker.conv30_b,    brokerOpen.conv30_b)},
      {product: '30Y FHA',     rate: num(broker.fha30_b)     ?? (num(broker.fha30)     !== null ? +(num(broker.fha30)     + 0.250).toFixed(3) : null), change: bpiDiff(broker.fha30_b,     brokerPrev.fha30_b),     change_intraday: bpiDiff(broker.fha30_b,     brokerOpen.fha30_b)},
      {product: '30Y VA',      rate: num(broker.va30_b)      ?? (num(broker.va30)      !== null ? +(num(broker.va30)      + 0.250).toFixed(3) : null), change: bpiDiff(broker.va30_b,      brokerPrev.va30_b),      change_intraday: bpiDiff(broker.va30_b,      brokerOpen.va30_b)},
      {product: '30Y JUMBO',   rate: num(broker.jumbo30_b)   ?? (num(broker.jumbo30)   !== null ? +(num(broker.jumbo30)   + 0.250).toFixed(3) : null), change: bpiDiff(broker.jumbo30_b,   brokerPrev.jumbo30_b),   change_intraday: bpiDiff(broker.jumbo30_b,   brokerOpen.jumbo30_b),   tag: 'JUMBO'},
      {product: '15Y CONV',    rate: num(broker.conv15_b)    ?? (num(broker.conv15)    !== null ? +(num(broker.conv15)    + 0.250).toFixed(3) : null), change: bpiDiff(broker.conv15_b,    brokerPrev.conv15_b),    change_intraday: bpiDiff(broker.conv15_b,    brokerOpen.conv15_b)},
      {product: '30Y CASHOUT', rate: num(broker.cashout30_b) ?? (num(broker.cashout30) !== null ? +(num(broker.cashout30) + 0.250).toFixed(3) : null), change: bpiDiff(broker.cashout30_b, brokerPrev.cashout30_b), change_intraday: bpiDiff(broker.cashout30_b, brokerOpen.cashout30_b), tag: 'CASHOUT'},
      {product: '30Y INVEST',  rate: num(broker.inv30_b)     ?? (num(broker.inv30)     !== null ? +(num(broker.inv30)     + 0.250).toFixed(3) : null), change: bpiDiff(broker.inv30_b,     brokerPrev.inv30_b),     change_intraday: bpiDiff(broker.inv30_b,     brokerOpen.inv30_b),     tag: 'INVEST'},
    ].filter(r => r.rate !== null);

    const bpi = {
      rates:   bpiRates,
      rates_b: bpiRates_b,
      as_of:   broker.as_of || null,
      has_prev: brokerPrevSnap.exists,   // lets UI know if change data is real
    };

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        fetchedAt: new Date().toISOString(),
        date:      today,
        // ── Intraday market data (scrapers) ──
        mbsProducts,
        shadowBonds,
        us30y:          us30yData,
        treasuryFutures,
        // ── Rate sheet data ──
        brokerRates,
        bpi,
        // ── FRED / external rates ──
        freddie,
        mcr,
        fredCache,
        // ── Signal engine ──
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
