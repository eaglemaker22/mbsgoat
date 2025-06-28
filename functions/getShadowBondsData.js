// netlify/functions/getShadowBondsData.js
const admin = require('firebase-admin');

// Secure Firebase setup using environment variables
const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase initialized in getShadowBondsData.js");
  } catch (error) {
    console.error("❌ Firebase init failed in getShadowBondsData.js:", error);
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
      last_updated: data.last_updated ?? null,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("❌ getShadowBondsData.js failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
