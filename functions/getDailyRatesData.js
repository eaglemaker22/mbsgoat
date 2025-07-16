// netlify/functions/getDailyRatesData.js
const admin = require("firebase-admin");

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
    const ratesCollectionRef = db.collection("fred_reports");

    // Log the start of fetching
    // console.log("Netlify Function: getDailyRatesData - Starting data fetch from Firestore."); // Commented for less console noise

    const [
      fixed30YSnap,
      va30YSnap,
      fha30YSnap,
      jumbo30YSnap,
      usda30YSnap,
      fixed15YSnap,
    ] = await Promise.all([
      ratesCollectionRef.doc("30Y Fixed Rate Conforming").get(),
      ratesCollectionRef.doc("30Y VA Mortgage Index").get(),
      ratesCollectionRef.doc("30Y FHA Mortgage Index").get(),
      ratesCollectionRef.doc("30Y Jumbo Mortgage Index").get(),
      ratesCollectionRef.doc("30Y USDA Mortgage Index").get(),
      ratesCollectionRef.doc("15Y Mortgage Avg US").get(),
    ]);

    const responseData = {};

    const addRateData = (docSnap, keyName) => {
      // console.log(`--- Processing ${keyName} ---`); // Commented for less console noise
      if (docSnap.exists) {
        const data = docSnap.data();
        // console.log(`Document for ${keyName} exists. Data:`, JSON.stringify(data)); // Commented for less console noise
        
        const latest = parseFloat(data.latest);
        const yesterday = parseFloat(data.yesterday); // Get yesterday's value
        
        let dailyChange = null;
        if (!isNaN(latest) && !isNaN(yesterday)) { // Calculate change based on latest vs. yesterday
            dailyChange = (latest - yesterday).toFixed(3);
        } else {
            // console.warn(`Invalid 'latest' or 'yesterday' for ${keyName}. Latest: ${data.latest}, Yesterday: ${data.yesterday}`); // Commented for less console noise
        }

        // Ensure 'yesterday' field is explicitly logged
        // console.log(`  ${keyName} - yesterday: ${data.yesterday} (type: ${typeof data.yesterday})`); // Commented for less console noise

        responseData[keyName] = {
          latest: data.latest ?? null,
          latest_date: data.latest_date ?? null,
          yesterday: data.yesterday ?? null,
          yesterday_date: data.yesterday_date ?? null, // Ensure yesterday_date is included
          last_month: data.last_month ?? null,
          last_month_date: data.last_month_date ?? null,
          year_ago: data.year_ago ?? null,
          year_ago_date: data.year_ago_date ?? null,
          daily_change: dailyChange, // NEW: Include daily_change
        };

      } else {
        // console.warn(`Document for ${keyName} not found in Firestore.`); // Commented for less console noise
        responseData[keyName] = null;
      }
      // console.log(`--- End Processing ${keyName} ---`); // Commented for less console noise
    };

    addRateData(fixed30YSnap, "fixed30Y");
    addRateData(va30YSnap, "va30Y");
    addRateData(fha30YSnap, "fha30Y");
    addRateData(jumbo30YSnap, "jumbo30y");
    addRateData(usda30YSnap, "usda30y");
    addRateData(fixed15YSnap, "fixed15y");

    // console.log("Netlify Function: getDailyRatesData - Response Data:", JSON.stringify(responseData)); // Commented for less console noise

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // IMPORTANT: For production, change '*' to your specific domain for security
      },
      body: JSON.stringify(responseData),
    };

  } catch (error) {
    console.error("Error in getDailyRatesData:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
