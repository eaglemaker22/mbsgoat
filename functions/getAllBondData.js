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
    const us10yDocRef = db.collection("market_data").doc("us10y_current");
    const us30yDocRef = db.collection("market_data").doc("us30y_current");

    const [realSnap, shadowSnap, us10ySnap, us30ySnap] = await Promise.all([
      realDocRef.get(),
      shadowDocRef.get(),
      us10yDocRef.get(),
      us30yDocRef.get()
    ]);

    const realData = realSnap.exists ? realSnap.data() : {};
    const shadowData = shadowSnap.exists ? shadowSnap.data() : {};
    const us10yData = us10ySnap.exists ? us10ySnap.data() : {};
    const us30yData = us30ySnap.exists ? us30ySnap.data() : {};

    // --- DEBUGGING LOGS: These are now ACTIVE and will print to Netlify logs ---
    console.log("--- Raw Shadow Data Fetched from Firestore ---");
    console.log(JSON.stringify(shadowData, null, 2));
    console.log("----------------------------------------------");

    function extractBondFields(data, prefix) {
      // CORRECTED: Changed '_TodayHigh' to '_High' and '_TodayLow' to '_Low'
      // to match the field names seen in your Firestore screenshot for shadow_bonds.
      const extracted = {
        change: data[`${prefix}_Daily_Change`] || null,
        current: data[`${prefix}_Current`] || null,
        prevClose: data[`${prefix}_PriorDayClose`] || null,
        open: data[`${prefix}_Open`] || null,
        high: data[`${prefix}_High`] || null,   // CORRECTED HERE
        low: data[`${prefix}_Low`] || null,     // CORRECTED HERE
      };
      // --- DEBUGGING LOG: This is now ACTIVE and will print for each bond processed ---
      console.log(`--- Extracted Data for ${prefix} ---`);
      console.log(extracted);
      console.log("------------------------------------");
      return extracted;
    }

    const result = {
      last_updated: shadowData.last_updated || null,

      UMBS_5_5: extractBondFields(realData, "UMBS_5_5"),
      UMBS_6_0: extractBondFields(realData, "UMBS_6_0"),
      GNMA_5_5: extractBondFields(realData, "GNMA_5_5"),
      GNMA_6_0: extractBondFields(realData, "GNMA_6_0"),

      UMBS_5_5_Shadow: extractBondFields(shadowData, "UMBS_5_5_Shadow"),
      UMBS_6_0_Shadow: extractBondFields(shadowData, "UMBS_6_0_Shadow"),
      GNMA_5_5_Shadow: extractBondFields(shadowData, "GNMA_5_5_Shadow"),
      GNMA_6_0_Shadow: extractBondFields(shadowData, "GNMA_6_0_Shadow"), // The target for debugging

      US10Y: extractBondFields(us10yData, "US10Y"),
      US30Y: extractBondFields(us30yData, "US30Y"),
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // IMPORTANT: For production, change '*' to your specific domain for security
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
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
