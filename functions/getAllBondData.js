// netlify/functions/getAllBondData.js
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
    const realDocRef = db.collection("market_data").doc("mbs_products");
    const shadowDocRef = db.collection("market_data").doc("shadow_bonds");

    const [realSnap, shadowSnap] = await Promise.all([
      realDocRef.get(),
      shadowDocRef.get()
    ]);

    if (!realSnap.exists || !shadowSnap.exists) {
      throw new Error("One or more documents not found");
    }

    const realData = realSnap.data();
    const shadowData = shadowSnap.data();

    function extractBondFields(data, prefix) {
      return {
        change: data[`${prefix}_Daily_Change`] || null,
        current: data[`${prefix}_Current`] || null,
        prevClose: data[`${prefix}_PriorDayClose`] || null, // Assuming this is the field name in Firestore
        open: data[`${prefix}_Open`] || null,
        high: data[`${prefix}_TodayHigh`] || null,
        low: data[`${prefix}_TodayLow`] || null,
      };
    }

    const result = {
      // Add the last_updated field here.
      // We assume it's present in the 'shadow_bonds' document based on prior discussion,
      // but if it's in 'mbs_products' or both, adjust accordingly.
      last_updated: shadowData.last_updated || null, // FIX: Added this line to include the timestamp

      UMBS_5_5: extractBondFields(realData, "UMBS_5_5"),
      UMBS_6_0: extractBondFields(realData, "UMBS_6_0"),
      GNMA_5_5: extractBondFields(realData, "GNMA_5_5"),
      GNMA_6_0: extractBondFields(realData, "GNMA_6_0"),

      UMBS_5_5_Shadow: extractBondFields(shadowData, "UMBS_5_5_Shadow"),
      UMBS_6_0_Shadow: extractBondFields(shadowData, "UMBS_6_0_Shadow"),
      GNMA_5_5_Shadow: extractBondFields(shadowData, "GNMA_5_5_Shadow"),
      GNMA_6_0_Shadow: extractBondFields(shadowData, "GNMA_6_0_Shadow")
    };

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error("Error in getAllBondData:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
