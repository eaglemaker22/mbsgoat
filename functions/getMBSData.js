// netlify/functions/getMBSData.js
const admin = require('firebase-admin');

// Pull credentials from Netlify environment variables
const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase initialized in getMBSData.js");
  } catch (error) {
    console.error("❌ Firebase init failed in getMBSData.js:", error);
  }
}

const db = admin.firestore();

exports.handler = async function (event, context) {
  try {
    const doc = await db.collection("mbs_data").doc("market_data").get();

    if (!doc.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Document not found" }),
      };
    }

    const data = doc.data();

    const response = {
      UMBS_5_5_Current: data.UMBS_5_5_Current ?? null,
      UMBS_5_5_Daily_Change: data.UMBS_5_5_Daily_Change ?? null,
      UMBS_5_5_Open: data.UMBS_5_5_Open ?? null,

      UMBS_6_0_Current: data.UMBS_6_0_Current ?? null,
      UMBS_6_0_Daily_Change: data.UMBS_6_0_Daily_Change ?? null,
      UMBS_6_0_Open: data.UMBS_6_0_Open ?? null,

      GNMA_5_5_Current: data.GNMA_5_5_Current ?? null,
      GNMA_5_5_Daily_Change: data.GNMA_5_5_Daily_Change ?? null,
      GNMA_5_5_Open: data.GNMA_5_5_Open ?? null,

      GNMA_6_0_Current: data.GNMA_6_0_Current ?? null,
      GNMA_6_0_Daily_Change: data.GNMA_6_0_Daily_Change ?? null,
      GNMA_6_0_Open: data.GNMA_6_0_Open ?? null,

      last_updated: data.timestamp ?? null
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("❌ getMBSData.js failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
