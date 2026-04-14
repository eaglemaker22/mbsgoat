const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const [mbsSnap, bondsSnap] = await Promise.all([
      db.collection('market_data').doc('mbs_products').get(),
      db.collection('market_data').doc('shadow_bonds').get(),
    ]);

    if (!mbsSnap.exists || !bondsSnap.exists) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ error: 'Firestore documents not found' }),
      };
    }

    const mbs = mbsSnap.data();
    const bonds = bondsSnap.data();

    /* ── helpers ── */
    const f = (val) => parseFloat(val) || 0;
    const priceTicks = (cur, opn) => Math.round((f(cur) - f(opn)) * 32 * 10) / 10;
    const bpsDelta = (cur, opn) => Math.round((f(cur) - f(opn)) * 100 * 10) / 10;

    /* ── UMBS 5.0 ── */
    const umbs50_current = f(mbs.UMBS_5_0_Current);
    const umbs50_open    = f(mbs.UMBS_5_0_Open);
    const umbs50_hi      = f(mbs.UMBS_5_0_TodayHigh);
    const umbs50_lo      = f(mbs.UMBS_5_0_TodayLow);
    const umbs50_delta   = priceTicks(umbs50_current, umbs50_open);
    const umbs50_hiTicks = priceTicks(umbs50_hi, umbs50_open);
    const umbs50_loTicks = priceTicks(umbs50_lo, umbs50_open);

    /* ── 10Y yield ── */
    const t10y_current = f(bonds.US10Y_Current);
    const t10y_open    = f(bonds.US10Y_Open);
    const t10y_delta   = bpsDelta(t10y_current, t10y_open);

    /* ── ZN1! futures ── */
    const zn_current   = f(bonds.ZN1_Current);
    const zn_open      = f(bonds.ZN1_Open);
    const zn_hi        = f(bonds.ZN1_TodayHigh);
    const zn_lo        = f(bonds.ZN1_TodayLow);
    const zn_deltaTicks = f(bonds.delta_ZN_ticks);
    const zn_hiTicks   = priceTicks(zn_hi, zn_open);
    const zn_loTicks   = priceTicks(zn_lo, zn_open);

    /* ── $/100k estimate (0.25 pts per 10 bps of UMBS move, in dollars) ── */
    const est_per100k  = Math.round(-(umbs50_delta / 10) * 0.25 * 1000);

    /* ── format price as bond notation (e.g. 99-12) ── */
    function bondFmt(decPrice) {
      const whole = Math.floor(decPrice);
      const ticks = Math.round((decPrice - whole) * 32);
      return `${whole}-${String(ticks).padStart(2, '0')}`;
    }

    const payload = {
      last_updated: bonds.last_updated || mbs.last_updated,
      trading_day:  bonds.trading_day_date,

      umbs50: {
        current:    umbs50_current,
        open:       umbs50_open,
        openFmt:    bondFmt(umbs50_open),
        currentFmt: bondFmt(umbs50_current),
        delta:      umbs50_delta,
        hiTicks:    umbs50_hiTicks,
        loTicks:    umbs50_loTicks,
      },

      t10y: {
        current:  t10y_current,
        open:     t10y_open,
        openFmt:  t10y_open.toFixed(3) + '%',
        delta:    t10y_delta,
        // 10Y has no intraday H/L in shadow_bonds — null for now
        hiTicks:  null,
        loTicks:  null,
      },

      zn: {
        current:    zn_current,
        open:       zn_open,
        openFmt:    bondFmt(zn_open),
        currentFmt: bondFmt(zn_current),
        raw:        bonds.ZN1_Raw,
        delta:      zn_deltaTicks,
        hiTicks:    zn_hiTicks,
        loTicks:    zn_loTicks,
      },

      est_per100k,

      regression: {
        predicted_umbs55_delta: f(bonds.predicted_UMBS55_delta_ticks),
        model_version: bonds.regression_model_version,
        delta_10y: f(bonds.delta_10Y),
        delta_zn_ticks: f(bonds.delta_ZN_ticks),
        delta_mbb: f(bonds.delta_MBB),
      },

      scraper_status: {
        mbs_scraper:   mbs.scraper_name,
        bonds_scraper: bonds.scraper_name,
        mbs_updated:   mbs.last_updated,
        bonds_updated: bonds.last_updated,
      },
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(payload),
    };

  } catch (err) {
    console.error('getMarketData error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
