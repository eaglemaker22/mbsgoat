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

// ===== SAFE PARSE =====
const num = (v) => {
  if (!v || v === 'N/A') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

// ===== BPS CALC =====
const bps = (cur, open) => {
  const c = num(cur);
  const o = num(open);
  if (c === null || o === null) return null;
  return (c - o) * 100;
};

// ===== MAIN =====
exports.handler = async function () {
  try {
    const mbsSnap = await db.collection('market_data').doc('mbs_products').get();
    const bondsSnap = await db.collection('market_data').doc('shadow_bonds').get();

    const mbs = mbsSnap.data();
    const bonds = bondsSnap.data();

    const instruments = {
      // ===== MBS =====
      umbs50: { delta: bps(mbs.UMBS_5_0_Current, mbs.UMBS_5_0_Open) },
      umbs55: { delta: bps(mbs.UMBS_5_5_Current, mbs.UMBS_5_5_Open) },
      umbs60: { delta: bps(mbs.UMBS_6_0_Current, mbs.UMBS_6_0_Open) },

      gnma50: { delta: bps(mbs.GNMA_5_0_Current, mbs.GNMA_5_0_Open) },
      gnma55: { delta: bps(mbs.GNMA_5_5_Current, mbs.GNMA_5_5_Open) },
      gnma60: { delta: bps(mbs.GNMA_6_0_Current, mbs.GNMA_6_0_Open) },

      // ===== TREASURIES =====
      us10y: { delta: bps(bonds.US10Y_Current, bonds.US10Y_Open) },

      // US30Y HAS NO OPEN → disable for now
      us30y: { delta: null },

      // ===== MBB =====
      mbb: {
        delta: bps(bonds.MBB_Current, bonds.MBB_Open),
      },

      // ===== FUTURES (convert ticks → rough bps proxy) =====
      zn: {
        delta: num(bonds.delta_ZN_ticks) * 3.125 || null,
      },
      zb: { delta: null },
      zf: { delta: null },
      zt: { delta: null },
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        last_updated: mbs.last_updated,
        instruments,
      }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
