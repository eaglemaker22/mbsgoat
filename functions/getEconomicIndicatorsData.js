// netlify/functions/getEconomicIndicatorsData.js
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK only if it hasn't been initialized yet
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      // IMPORTANT: Replace \\n with \n in the private key string
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

exports.handler = async function (event, context) {
  try {
    const indicatorsCollectionRef = db.collection("economic_indicators");

    // List of series IDs you want to fetch
    const seriesIds = [
      "HOUST", // Total Housing Starts
      "PERMIT1", // Single-Family Permits
      "HOUST1F", // Single-Family Housing Starts (if you want to include it)
      "RSXFS", // Retail Sales Excl. Food Services
      "UMCSENT", // Consumer Sentiment
      "CSUSHPINSA", // Case-Shiller US National Home Price Index
      "PERMIT", // Building Permits, Total
      "T10YIE", // 10-Year Breakeven Inflation Rate
      "T10Y2Y", // 10-Year Treasury Constant Maturity Minus 2-Year Treasury Constant Maturity
    ];

    const snapshots = await Promise.all(
      seriesIds.map((id) => indicatorsCollectionRef.doc(id).get())
    );

    const responseData = {};

    snapshots.forEach((docSnap) => {
      if (docSnap.exists) {
        const data = docSnap.data();
        const seriesId = data.series_id; // Ensure series_id is present in the document

        // Calculate monthly change if data allows
        let monthlyChange = null;
        if (data.latest !== undefined && data.last_month !== undefined && data.latest !== null && data.last_month !== null) {
          const latestValue = parseFloat(data.latest);
          const lastMonthValue = parseFloat(data.last_month);
          if (!isNaN(latestValue) && !isNaN(lastMonthValue)) {
            monthlyChange = (latestValue - lastMonthValue).toFixed(2); // Keep 2 decimal places for change
          }
        }
        
        responseData[seriesId] = {
          latest: data.latest ?? null,
          latest_date: data.latest_date ?? null,
          last_month: data.last_month ?? null,
          last_month_date: data.last_month_date ?? null,
          year_ago: data.year_ago ?? null,
          year_ago_date: data.year_ago_date ?? null,
          monthly_change: monthlyChange, // Add the calculated change
        };
      } else {
        console.warn(`Document for series ID ${docSnap.id} not found.`);
        responseData[docSnap.id] = null; // Mark as null if document doesn't exist
      }
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(responseData),
    };
  } catch (error) {
    console.error("Error in getEconomicIndicatorsData:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: error.message, stack: error.stack }), // Include stack for debugging
    };
  }
};
