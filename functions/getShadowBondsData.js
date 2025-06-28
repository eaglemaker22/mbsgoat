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
    // This fetches the single document containing all bond data.
    // Ensure 'mbs_data' is your collection and 'market_data' is your document ID.
    const doc = await db.collection("mbs_data").doc("market_data").get();

    if (!doc.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Document 'market_data' not found in 'mbs_data' collection." }),
      };
    }

    const data = doc.data(); // This object holds all fields from the Firestore document.

    // Construct the response to match frontend expectations for ALL bond data (especially shadow bonds)
    // We are mapping Firestore field names to simplified keys (change, current, etc.)
    // as per the frontend script's `bondKeys` loop structure.
    const responseData = {
      UMBS_5_5_Shadow: {
        change: data.UMBS_5_5_Shadow_Daily_Change ?? null,
        current: data.UMBS_5_5_Shadow_Current ?? null,
        open: data.UMBS_5_5_Shadow_Open ?? null,
        prevClose: data.UMBS_5_5_Shadow_PriorDayClose ?? null,
        high: data.UMBS_5_5_Shadow_TodayHigh ?? null,
        low: data.UMBS_5_5_Shadow_TodayLow ?? null,
      },
      UMBS_6_0_Shadow: {
        change: data.UMBS_6_0_Shadow_Daily_Change ?? null,
        current: data.UMBS_6_0_Shadow_Current ?? null,
        open: data.UMBS_6_0_Shadow_Open ?? null,
        prevClose: data.UMBS_6_0_Shadow_PriorDayClose ?? null,
        high: data.UMBS_6_0_Shadow_TodayHigh ?? null,
        low: data.UMBS_6_0_Shadow_TodayLow ?? null,
      },
      GNMA_5_5_Shadow: { // Assuming you also want to populate these if data exists in Firestore
        change: data.GNMA_5_5_Shadow_Daily_Change ?? null,
        current: data.GNMA_5_5_Shadow_Current ?? null,
        open: data.GNMA_5_5_Shadow_Open ?? null,
        prevClose: data.GNMA_5_5_Shadow_PriorDayClose ?? null,
        high: data.GNMA_5_5_Shadow_TodayHigh ?? null,
        low: data.GNMA_5_5_Shadow_TodayLow ?? null,
      },
      GNMA_6_0_Shadow: { // Assuming you also want to populate these
        change: data.GNMA_6_0_Shadow_Daily_Change ?? null,
        current: data.GNMA_6_0_Shadow_Current ?? null,
        open: data.GNMA_6_0_Shadow_Open ?? null,
        prevClose: data.GNMA_6_0_Shadow_PriorDayClose ?? null,
        high: data.GNMA_6_0_Shadow_TodayHigh ?? null,
        low: data.GNMA_6_0_Shadow_TodayLow ?? null,
      },
      // Include the overall last_updated time for the entire shadow_bonds document (if it's named last_updated in Firestore)
      last_updated: data.last_updated ?? null,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(responseData),
    };
  } catch (error) {
    console.error("❌ getShadowBondsData.js failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", details: error.message }),
    };
  }
};
