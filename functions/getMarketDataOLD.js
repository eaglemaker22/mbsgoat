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

// Delta in points (MBS price units — keeps ticks math clean on frontend)
const delta = (cur, open) => {
  const c = num(cur);
  const o = num(open);
  if (c === null || o === null) return null;
  return Math.round((c - o) * 10000) / 10000;
};

// Delta in basis points (for yields)
const deltaBps = (cur, open) => {
  const c = num(cur);
  const o = num(open);
  if (c === null || o === null) return null;
  return Math.round((c - o) * 1000) / 10;
};

// Today's date YYYY-MM-DD in Arizona local time (scraper timezone, MST = UTC-7)
function todayAZ() {
  const now = new Date();
  const az  = new Date(now.getTime() - 7 * 60 * 60 * 1000);
  return az.toISOString().slice(0, 10);
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

    const [mbsSnap, shadowSnap, us30ySnap, futuresSnap, brokerSnap, fredSnap, anchorSnap] =
      await Promise.all([
        db.collection('market_data').doc('mbs_products').get(),
        db.collection('market_data').doc('shadow_bonds').get(),
        db.collection('market_data').doc('us30y_current').get(),
        db.collection('market_data').doc('treasury_futures').get(),
        db.collection('market_data').doc('broker_rates').get(),
        db.collection('market_data').doc('fred_cache').get(),
        db.collection('daily_anchors').doc(today).get(),
      ]);

    const mbs     = mbsSnap.exists     ? mbsSnap.data()     : {};
    const shadow  = shadowSnap.exists  ? shadowSnap.data()  : {};
    const us30y   = us30ySnap.exists   ? us30ySnap.data()   : {};
    const futures = futuresSnap.exists ? futuresSnap.data() : {};
    const broker  = brokerSnap.exists  ? brokerSnap.data()  : {};
    const fred    = fredSnap.exists    ? fredSnap.data()    : {};
    const anchor  = anchorSnap.exists  ? anchorSnap.data()  : {};

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

    // ── Shadow Bonds (10Y, MBB, regression prediction) ───────────────────────
    const shadowBonds = {
      us10y_current: num(shadow.US10Y_Current),
      us10y_open:    num(shadow.US10Y_Open),
      us10y_delta:   deltaBps(shadow.US10Y_Current, shadow.US10Y_Open),

      mbb_current: num(shadow.MBB_Current),
      mbb_open:    num(shadow.MBB_Open),
      mbb_delta:   delta(shadow.MBB_Current, shadow.MBB_Open),

      // Regression-predicted UMBS 5.5 delta written by lockiq_TV_FH.py
      predicted_umbs55_delta: num(shadow.predicted_umbs55_delta)
                           ?? num(shadow.regression_predicted_umbs55_delta)
                           ?? null,

      last_updated:     shadow.last_updated     || null,
      trading_day_date: shadow.trading_day_date || null,
    };

    // ── US 30Y (separate doc) ─────────────────────────────────────────────────
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

    // ── Broker Rates (rate sheet pipeline output) ─────────────────────────────
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

    // ── FRED Cache (OBMMI + PMMS) ─────────────────────────────────────────────
    // Try both UPPER and lower case — field name may vary by scraper version
    const fc = (key) => num(fred[key]) ?? num(fred[key.toLowerCase()]) ?? null;
    const fredCache = {
      obmmic30yf:     fc('OBMMIC30YF'),
      obmmic15yf:     fc('OBMMIC15YF'),
      obmmifha30yf:   fc('OBMMIFHA30YF'),
      obmmiva30yf:    fc('OBMMIVA30YF'),
      obmmijumbo30yf: fc('OBMMIJUMBO30YF'),
      mortgage30us:   fc('MORTGAGE30US'),
      mortgage15us:   fc('MORTGAGE15US'),
      as_of:          fred.as_of || fred.fetched_at || null,
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

    // ── Response ──────────────────────────────────────────────────────────────
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
