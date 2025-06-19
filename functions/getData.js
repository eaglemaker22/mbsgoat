// netlify/functions/getData.js
const admin = require('firebase-admin');

// Use environment variables from Netlify instead of JSON config
const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

// Initialize Firebase Admin SDK once
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase initialized in getData.js");
  } catch (error) {
    console.error("❌ Firebase initialization failed in getData.js:", error);
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

    // Select a minimal payload, or return entire doc if preferred
    const response = {
      UMBS_5_5_Current: data.UMBS_5_5_Current ?? null,
      UMBS_5_5_Daily_Change: data.UMBS_5_5_Daily_Change ?? null,
      UMBS_5_5_Open: data.UMBS_5_5_Open ?? null,
      last_updated: data.timestamp ?? null,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("❌ getData.js failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
