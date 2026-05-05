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

const num = (v) => {
  if (v === null || v === undefined || v === '' || v === 'N/A') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const priceBps = (cur, open) => {
  const c = num(cur);
  const o = num(open);
  if (c === null || o === null) return null;
  return Math.round((c - o) * 1000) / 10;
};

exports.handler = async function () {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  try {
    const [mbsSnap, shadowSnap, us30ySnap, futuresSnap] = await Promise.all([
      db.collection('market_data').doc('mbs_products').get(),
      db.collection('market_data').doc('shadow_bonds').get(),
      db.collection('market_data').doc('us30y_current').get(),
      db.collection('market_data').doc('treasury_futures').get(),
    ]);

    const mbs = mbsSnap.exists ? mbsSnap.data() : {};
    const shadow = shadowSnap.exists ? shadowSnap.data() : {};
    const us30y = us30ySnap.exists ? us30ySnap.data() : {};
    const futures = futuresSnap.exists ? futuresSnap.data() : {};

    const instruments = {
      umbs50: { delta: priceBps(mbs.UMBS_5_0_Current, mbs.UMBS_5_0_Open) },
      umbs55: { delta: priceBps(mbs.UMBS_5_5_Current, mbs.UMBS_5_5_Open) },
      umbs60: { delta: priceBps(mbs.UMBS_6_0_Current, mbs.UMBS_6_0_Open) },

      gnma50: { delta: priceBps(mbs.GNMA_5_0_Current, mbs.GNMA_5_0_Open) },
      gnma55: { delta: priceBps(mbs.GNMA_5_5_Current, mbs.GNMA_5_5_Open) },
      gnma60: { delta: priceBps(mbs.GNMA_6_0_Current, mbs.GNMA_6_0_Open) },

      us10y: { delta: priceBps(shadow.US10Y_Current, shadow.US10Y_Open) },
      us30y: { delta: priceBps(us30y.US30Y_Current, us30y.US30Y_Open) },
      mbb: { delta: priceBps(shadow.MBB_Current, shadow.MBB_Open) },

      zn: { delta: priceBps(futures.ZN1_Current, futures.ZN1_Open) },
      zb: { delta: priceBps(futures.ZB1_Current, futures.ZB1_Open) },
      zf: { delta: priceBps(futures.ZF1_Current, futures.ZF1_Open) },
      zt: { delta: priceBps(futures.ZT1_Current, futures.ZT1_Open) },
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        version: 'lockiq-impact-v2-backend-bps',
        last_updated: {
          mbs: mbs.last_updated || null,
          shadow_bonds: shadow.last_updated || null,
          us30y: us30y.last_updated || null,
          treasury_futures: futures.last_updated || null,
        },
        trading_day: {
          mbs: mbs.trading_day_date || null,
          shadow_bonds: shadow.trading_day_date || null,
          us30y: us30y.trading_day_date || null,
          treasury_futures: futures.trading_day_date || null,
        },
        instruments,
      }),
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
