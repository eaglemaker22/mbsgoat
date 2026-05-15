const admin = require("firebase-admin");

function initFirebase() {
  if (admin.apps.length) return;

  // IMPORTANT:
  // Use the same Firebase credential env vars/init style
  // that your existing working Netlify Firebase function uses.
  //
  // This version expects FIREBASE_SERVICE_ACCOUNT as a JSON string.
  // If your existing getMarketData.js uses different env vars,
  // copy its admin.initializeApp block instead.

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

exports.handler = async function () {
  try {
    initFirebase();

    const db = admin.firestore();

    const snap = await db
      .collection("market_data")
      .doc("lockiq_live_pricing_index")
      .get();

    if (!snap.exists) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
        },
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Failed to load LockIQ index",
        details: error.message,
      }),
    };
  }
};
