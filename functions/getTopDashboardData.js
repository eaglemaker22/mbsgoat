// netlify/functions/getTopDashboardData.js
const admin = require("firebase-admin");

// Only initialize once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

exports.handler = async function (event, context) {
  try {
    const [mbsDoc, shadowDoc, us10yDoc, us30yDoc] = await Promise.all([
      db.collection("market_data").doc("mbs_products").get(),
      db.collection("market_data").doc("shadow_bonds").get(),
      db.collection("market_data").doc("us10y_current").get(),
      db.collection("market_data").doc("us30y_current").get(),
    ]);

    if (!mbsDoc.exists || !shadowDoc.exists || !us10yDoc.exists || !us30yDoc.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "One or more documents not found." }),
      };
    }

    const mbs = mbsDoc.data();
    const shadow = shadowDoc.data();
    const us10y = us10yDoc.data();
    const us30y = us30yDoc.data();

    return {
      statusCode: 200,
      body: JSON.stringify({
        UMBS_5_5: {
          current: mbs.UMBS_5_5_Current ?? null,
          change: mbs.UMBS_5_5_Daily_Change ?? null,
        },
        UMBS_6_0: {
          current: mbs.UMBS_6_0_Current ?? null,
          change: mbs.UMBS_6_0_Daily_Change ?? null,
        },
        GNMA_5_5: {
          current: mbs.GNMA_5_5_Current ?? null,
          change: mbs.GNMA_5_5_Daily_Change ?? null,
        },
        GNMA_6_0: {
          current: mbs.GNMA_6_0_Current ?? null,
          change: mbs.GNMA_6_0_Daily_Change ?? null,
        },
        UMBS_5_5_Shadow: {
          current: shadow.UMBS_5_5_Shadow_Current ?? null,
          change: shadow.UMBS_5_5_Shadow_Daily_Change ?? null,
        },
        UMBS_6_0_Shadow: {
          current: shadow.UMBS_6_0_Shadow_Current ?? null,
          change: shadow.UMBS_6_0_Shadow_Daily_Change ?? null,
        },
        GNMA_5_5_Shadow: {
          current: shadow.GNMA_5_5_Shadow_Current ?? null,
          change: shadow.GNMA_5_5_Shadow_Daily_Change ?? null,
        },
        GNMA_6_0_Shadow: {
          current: shadow.GNMA_6_0_Shadow_Current ?? null,
          change: shadow.GNMA_6_0_Shadow_Daily_Change ?? null,
        },
        US10Y: {
          yield: us10y.US10Y_Current ?? null,
          change: us10y.US10Y_Daily_Change ?? null,
        },
        US30Y: {
          yield: us30y.US30Y_Current ?? null,
          change: us30y.US30Y_Daily_Change ?? null,
        },
      }),
    };
  } catch (err) {
    console.error("❌ Top Dashboard Data Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
