const admin = require('firebase-admin');

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
    console.log("✅ Firebase initialized in getUS10YData.js");
  } catch (error) {
    console.error("❌ Firebase init failed in getUS10YData.js:", error);
  }
}

const db = admin.firestore();

exports.handler = async function (event, context) {
  try {
    const doc = await db.collection("market_data").doc("us10y_current").get();

    if (!doc.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Document not found" }),
      };
    }

    const data = doc.data();

    const response = {
      US10Y_Current: data.US10Y_Current ?? null,
      US10Y_Daily_Change: data.US10Y_Daily_Change ?? null,
      last_updated: data.last_updated ?? null,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("❌ getUS10YData.js failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
