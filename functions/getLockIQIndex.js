// getLockIQIndex.js — LockIQ Live Pricing Index API
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

exports.handler = async function () {
  try {
    const snap = await db
      .collection("market_data")
      .doc("lockiq_live_pricing_index")
      .get();

    if (!snap.exists) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "lockiq_live_pricing_index document not found",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify(snap.data()),
    };
  } catch (error) {
    console.error("getLockIQIndex error:", error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to load LockIQ index",
        details: error.message,
      }),
    };
  }
};
