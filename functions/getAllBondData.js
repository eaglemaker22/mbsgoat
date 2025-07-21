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
    const us10yDocRef = db.collection("market_data").doc("us10y_current"); // Reference to US10Y document
    const us30yDocRef = db.collection("market_data").doc("us30y_current"); // Reference to US30Y document

    const [realSnap, shadowSnap, us10ySnap, us30ySnap] = await Promise.all([
      realDocRef.get(),
      shadowDocRef.get(),
      us10yDocRef.get(),
      us30yDocRef.get()
    ]);

    // You might want to handle cases where these core documents don't exist
    if (!realSnap.exists) {
      console.warn("mbs_products document not found.");
    }
    if (!shadowSnap.exists) {
      console.warn("shadow_bonds document not found.");
    }
    // Note: For US10Y/US30Y, we'll use empty objects if not found to prevent errors
    // and let the frontend display '--'
    const realData = realSnap.exists ? realSnap.data() : {};
    const shadowData = shadowSnap.exists ? shadowSnap.data() : {};
    const us10yData = us10ySnap.exists ? us10ySnap.data() : {};
    const us30yData = us30ySnap.exists ? us30ySnap.data() : {};


    // This helper function extracts the core bond fields (current, change, open, etc.)
    function extractBondFields(data, prefix) {
      return {
        change: data[`${prefix}_Daily_Change`] || null,
        current: data[`${prefix}_Current`] || null,
        prevClose: data[`${prefix}_PriorDayClose`] || null,
        open: data[`${prefix}_Open`] || null,
        high: data[`${prefix}_TodayHigh`] || null,
        low: data[`${prefix}_TodayLow`] || null,
      };
    }

    const result = {
      // This overall last_updated can remain for general section timestamp if needed,
      // but individual rows will now use their specific timestamps.
      last_updated: shadowData.last_updated || null, 

      // MBS Products - Now include document-level last_updated for each instrument
      UMBS_5_5: { ...extractBondFields(realData, "UMBS_5_5"), last_updated: realData.last_updated || null },
      UMBS_6_0: { ...extractBondFields(realData, "UMBS_6_0"), last_updated: realData.last_updated || null },
      GNMA_5_5: { ...extractBondFields(realData, "GNMA_5_5"), last_updated: realData.last_updated || null },
      GNMA_6_0: { ...extractBondFields(realData, "GNMA_6_0"), last_updated: realData.last_updated || null },

      // Shadow Bonds - Now include document-level last_updated for each instrument
      UMBS_5_5_Shadow: { ...extractBondFields(shadowData, "UMBS_5_5_Shadow"), last_updated: shadowData.last_updated || null },
      UMBS_6_0_Shadow: { ...extractBondFields(shadowData, "UMBS_6_0_Shadow"), last_updated: shadowData.last_updated || null },
      GNMA_5_5_Shadow: { ...extractBondFields(shadowData, "GNMA_5_5_Shadow"), last_updated: shadowData.last_updated || null },
      GNMA_6_0_Shadow: { ...extractBondFields(shadowData, "GNMA_6_0_Shadow"), last_updated: shadowData.last_updated || null },

      // US10Y and US30Y data - Now include document-level last_updated for each instrument
      US10Y: { ...extractBondFields(us10yData, "US10Y"), last_updated: us10yData.last_updated || null },
      US30Y: { ...extractBondFields(us30yData, "US30Y"), last_updated: us30yData.last_updated || null },
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
