// netlify/functions/getTopDashboardData.js
const admin = require("firebase-admin");

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
    const mbsDoc = await db.collection("market_data").doc("mbs_products").get();
    const shadowDoc = await db.collection("market_data").doc("shadow_bonds").get();
    const us10yDoc = await db.collection("market_data").doc("us10y_current").get();

    if (!mbsDoc.exists || !shadowDoc.exists || !us10yDoc.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "One or more documents not found." }),
      };
    }

    const mbs = mbsDoc.data();
    const shadow = shadowDoc.data();
    const treasuries = us10yDoc.data();

    return {
      statusCode: 200,
      body: JSON.stringify({
        UMBS_5_5: {
          current: mbs.UMBS_5_5_Current,
          change: mbs.UMBS_5_5_Daily_Change,
          open: mbs.UMBS_5_5_Open,
          last_updated: mbs.last_updated
        },
        UMBS_5_5_Shadow: {
          current: shadow.UMBS_5_5_Shadow_Current,
          change: shadow.UMBS_5_5_Shadow_Daily_Change,
          open: shadow.UMBS_5_5_Shadow_Open,
          last_updated: shadow.last_updated
        },
        US10Y: {
          yield: treasuries.US10Y,
          change: treasuries.US10Y_Daily_Change ?? null,
          last_updated: treasuries.timestamp
        },
        US30Y: {
          yield: treasuries.US30Y,
          change: treasuries.US30Y_Daily_Change ?? null,
          last_updated: treasuries.timestamp
        }
      })
    };
  } catch (err) {
    console.error("Top Dashboard Data Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
