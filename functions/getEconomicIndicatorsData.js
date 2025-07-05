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
    const indicatorsCollectionRef = db.collection("fred_reports");

    const documentIds = [
      "Total Housing Starts",
      "Single-Family Permits",
      "Single-Family Housing Starts",
      "Retail Sales (Excl. Food)",
      "Consumer Sentiment",
      "Case-Shiller US HPI",
      "Building Permits",
      "10Y Breakeven Inflation Rate",
      "10Y Treasury Minus 2Y Treasury",
    ];

    const snapshots = await Promise.all(
      documentIds.map((id) => indicatorsCollectionRef.doc(id).get())
    );

    const responseData = {};

    snapshots.forEach((docSnap) => {
      if (docSnap.exists) {
        const data = docSnap.data();
        const seriesId = data.series_id;

        let monthlyChange = null;
        if (
          data.latest !== undefined &&
          data.last_month !== undefined &&
          data.latest !== null &&
          data.last_month !== null
        ) {
          const latestValue = parseFloat(data.latest);
          const lastMonthValue = parseFloat(data.last_month);
          if (!isNaN(latestValue) && !isNaN(lastMonthValue)) {
            monthlyChange = (latestValue - lastMonthValue).toFixed(2);
          }
        }

        responseData[seriesId] = {
          latest: data.latest ?? null,
          latest_date: data.latest_date ?? null,
          last_month: data.last_month ?? null,
          last_month_date: data.last_month_date ?? null,
          year_ago: data.year_ago ?? null,
          year_ago_date: data.year_ago_date ?? null,
          monthly_change: monthlyChange,
          // NEW FIELDS:
          next_release: data.next_release ?? null,
          coverage_period: data.coverage_period ?? null,
        };
      } else {
        console.warn(`Document with ID "${docSnap.id}" not found in collection.`);
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
      body: JSON.stringify({ error: error.message, stack: error.stack }),
    };
  }
};
