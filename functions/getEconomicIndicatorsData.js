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
    // CHANGE THIS LINE TO MATCH YOUR ACTUAL COLLECTION NAME
    const indicatorsCollectionRef = db.collection("fred_reports"); // <--- CONFIRMED CHANGE

    // List of DOCUMENT IDs as they appear in your Firestore 'fred_reports' collection
    // These must EXACTLY match the titles you showed:
    const documentIds = [ // <--- RENAMED variable for clarity
      "Total Housing Starts",
      "Single-Family Permits",
      "Single-Family Housing Starts", // Assuming this is also a document title if you want to pull it
      "Retail Sales (Excl. Food)",
      "Consumer Sentiment",
      "Case-Shiller US HPI",
      "Building Permits",
      "10Y Breakeven Inflation Rate",
      "10Y Treasury Minus 2Y Treasury",
    ];

    const snapshots = await Promise.all(
      documentIds.map((id) => indicatorsCollectionRef.doc(id).get()) // <--- Using documentIds here
    );

    const responseData = {};

    snapshots.forEach((docSnap) => {
      if (docSnap.exists) {
        const data = docSnap.data();
        // Use the series_id field from the document for the response key
        const seriesId = data.series_id; 

        // Calculate monthly change if data allows
        let monthlyChange = null;
        if (data.latest !== undefined && data.last_month !== undefined && data.latest !== null && data.last_month !== null) {
          const latestValue = parseFloat(data.latest);
          const lastMonthValue = parseFloat(data.last_month);
          if (!isNaN(latestValue) && !isNaN(lastMonthValue)) {
            monthlyChange = (latestValue - lastMonthValue).toFixed(2); // Keep 2 decimal places for change
          }
        }
        
        responseData[seriesId] = { // <--- Using the series_id field from the document as the key
          latest: data.latest ?? null,
          latest_date: data.latest_date ?? null,
          last_month: data.last_month ?? null,
          last_month_date: data.last_month_date ?? null,
          year_ago: data.year_ago ?? null,
          year_ago_date: data.year_ago_date ?? null,
          monthly_change: monthlyChange, // Add the calculated change
        };
      } else {
        // Log which document ID was not found, this is helpful for debugging
        console.warn(`Document with ID "${docSnap.id}" not found in collection.`);
        // If a document is not found, we still want to include its corresponding
        // seriesId in the response with null, so the frontend doesn't break.
        // We'll need a reverse map or assume seriesId is the doc id in case of missing data.
        // For simplicity for now, it will simply be omitted if docSnap.exists is false.
        // This is okay as the frontend will default to '--'.
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
