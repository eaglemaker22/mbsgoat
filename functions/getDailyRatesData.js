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
    console.log("Netlify Function: getDailyRatesData - Starting data fetch from Firestore.");

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
      console.log(`--- Processing ${keyName} ---`); // Debug log for each rate
      if (docSnap.exists) {
        const data = docSnap.data();
        console.log(`Document for ${keyName} exists. Data:`, JSON.stringify(data)); // Log full data
        
        const latest = parseFloat(data.latest);
        const lastMonth = parseFloat(data.last_month); 

        let dailyChange = null;
        if (!isNaN(latest) && !isNaN(lastMonth)) {
            dailyChange = (latest - lastMonth).toFixed(3);
        } else {
            console.warn(`Invalid 'latest' or 'last_month' for ${keyName}. Latest: ${data.latest}, LastMonth: ${data.last_month}`);
        }

        // Ensure 'yesterday' field is explicitly logged
        console.log(`  ${keyName} - yesterday: ${data.yesterday} (type: ${typeof data.yesterday})`);

        responseData[keyName] = {
          latest: data.latest ?? null,
          latest_date: data.latest_date ?? null,
          yesterday: data.yesterday ?? null, // This should now pick up the string/float from Firestore
          last_month: data.last_month ?? null,
          last_month_date: data.last_month_date ?? null,
          year_ago: data.year_ago ?? null,
          year_ago_date: data.year_ago_date ?? null,
          daily_change: dailyChange,
        };

      } else {
        console.warn(`Document for ${keyName} not found in Firestore.`); // More specific warning
        responseData[keyName] = null;
      }
      console.log(`--- End Processing ${keyName} ---`);
    };

    addRateData(fixed30YSnap, "fixed30Y");
    addRateData(va30YSnap, "va30Y");
    addRateData(fha30YSnap, "fha30Y");
    addRateData(jumbo30YSnap, "jumbo30y");
    addRateData(usda30YSnap, "usda30y");
    addRateData(fixed15YSnap, "fixed15y");

    console.log("Netlify Function: getDailyRatesData - Response Data:", JSON.stringify(responseData)); // Log final response

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
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
