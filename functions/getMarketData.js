const admin = require('firebase-admin');
const https = require('https');

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

// ===== HELPERS =====
const f = (val) => parseFloat(val) || 0;

const ticks = (cur, opn) =>
  Math.round((f(cur) - f(opn)) * 32 * 10) / 10;

const bps = (cur, opn) =>
  Math.round((f(cur) - f(opn)) * 100 * 10) / 10;

// ===== MAIN =====
exports.handler = async function () {
  try {
    const [mbsSnap, bondsSnap] = await Promise.all([
      db.collection('market_data').doc('mbs_products').get(),
      db.collection('market_data').doc('shadow_bonds').get(),
    ]);

    if (!mbsSnap.exists || !bondsSnap.exists) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing Firestore data' }),
      };
    }

    const mbs = mbsSnap.data();
    const bonds = bondsSnap.data();

    // ===== BUILD INSTRUMENTS =====
    const instruments = {
      // --- UMBS ---
      umbs50: {
        delta: ticks(mbs.UMBS_5_0_Current, mbs.UMBS_5_0_Open),
      },
      umbs55: {
        delta: f(bonds.predicted_UMBS55_delta_ticks),
      },
      umbs60: {
        delta: ticks(mbs.UMBS_6_0_Current, mbs.UMBS_6_0_Open),
      },

      // --- GNMA ---
      gnma50: {
        delta: ticks(mbs.GNMA_5_0_Current, mbs.GNMA_5_0_Open),
      },
      gnma55: {
        delta: ticks(mbs.GNMA_5_5_Current, mbs.GNMA_5_5_Open),
      },
      gnma60: {
        delta: ticks(mbs.GNMA_6_0_Current, mbs.GNMA_6_0_Open),
      },

      // --- TREASURIES ---
      us10y: {
        delta: bps(bonds.US10Y_Current, bonds.US10Y_Open),
      },
      us30y: {
        delta: bps(bonds.US30Y_Current, bonds.US30Y_Open),
      },

      // --- MBB ---
      mbb: {
        delta: f(bonds.delta_MBB),
      },

      // --- FUTURES ---
      zn: {
        delta: f(bonds.delta_ZN_ticks),
      },
      zb: {
        delta: f(bonds.delta_ZB_ticks),
      },
      zf: {
        delta: f(bonds.delta_ZF_ticks),
      },
      zt: {
        delta: f(bonds.delta_ZT_ticks),
      },
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        last_updated: bonds.last_updated || mbs.last_updated,
        trading_day: bonds.trading_day_date,
        instruments,
      }),
    };

  } catch (err) {
    console.error('ERROR:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
