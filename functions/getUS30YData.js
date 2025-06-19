// Minimal getUS30YData function for Netlify
const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
};

const serviceAccount = require("./firebase-config.json");

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

exports.handler = async function (event, context) {
  try {
    const doc = await db.collection("bonds_for_umbs").doc("market_data").get();
    if (!doc.exists) {
      return { statusCode: 404, body: JSON.stringify({ error: "Document not found" }) };
    }

    const data = doc.data();

    const response = {
      US30Y_Current: data.US30Y ?? null,
      US30Y_Daily_Change: null, // No daily change value exists yet
      last_updated: data.timestamp ?? null
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error("US30Y Fetch Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};
