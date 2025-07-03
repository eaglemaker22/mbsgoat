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
    const treasuries10 = us10yDoc.data();
    const treasuries30 = us30yDoc.data();

    return {
      statusCode: 200,
      body: JSON.stringify({
        UMBS_5_5: {
          current: mbs.UMBS_5_5_Current,
          change: mbs.UMBS_5_5_Daily_Change,
          open: mbs.UMBS_5_5_Open,
          last_updated: mbs.last_updated?.replace(" ", "T") || null,
        },     
        GNMA_5_5: {
          current: mbs.GNMA_5_5_Current,
          change: mbs.GNMA_5_5_Daily_Change,
          open: mbs.GNMA_5_5_Open,
          last_updated: mbs.last_updated?.replace(" ", "T") || null,
        },
        UMBS_5_5_Shadow: {
          current: shadow.UMBS_5_5_Shadow_Current,
          change: shadow.UMBS_5_5_Shadow_Daily_Change,
          open: shadow.UMBS_5_5_Shadow_Open,
          last_updated: shadow.last_updated?.replace(" ", "T") || null,
        },
        US10Y: {
          yield: treasuries10.US10Y_Current ?? null,
          change: treasuries10.US10Y_Daily_Change ?? null,
          last_updated: treasuries10.last_updated?.replace(" ", "T") || null,
        },
        US30Y: {
          yield: treasuries30.US30Y_Current ?? null,
          change: treasuries30.US30Y_Daily_Change ?? null,
          last_updated: treasuries30.last_updated?.replace(" ", "T") || null,
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
