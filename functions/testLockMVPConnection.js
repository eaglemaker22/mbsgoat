const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

exports.handler = async function (event, context) {
  try {
    const doc = await db.collection("mbs_data").doc("market_data").get();
    if (!doc.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, message: "Document not found" }),
      };
    }

    const testFields = doc.data();
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        preview: {
          UMBS_5_5_Current: testFields.UMBS_5_5_Current || "N/A",
          timestamp: testFields.timestamp || "N/A",
        },
      }),
    };
  } catch (err) {
    console.error("❌ Firebase connection error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message,
      }),
    };
  }
};
