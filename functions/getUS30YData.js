const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

exports.handler = async function (event, context) {
  try {
    const doc = await db.collection("market_data").doc("us30y_current").get();
    if (!doc.exists) {
      return { statusCode: 404, body: JSON.stringify({ error: "Document not found" }) };
    }

    const data = doc.data();

    const response = {
      US30Y_Current: data.US30Y_Current ?? null,
      US30Y_Daily_Change: data.US30Y_Daily_Change ?? null,
      US30Y_Open: data.US30Y_Open ?? null,
      US30Y_TodayHigh: data.US30Y_TodayHigh ?? null,
      US30Y_TodayLow: data.US30Y_TodayLow ?? null,
      US30Y_PriorDayClose: data.US30Y_PriorDayClose ?? null,
      US30Y_Close: data.US30Y_Close ?? null,
      last_updated: data.last_updated ?? null,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("❌ getUS30YData.js failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
