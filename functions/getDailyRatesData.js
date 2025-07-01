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
      ratesCollectionRef.doc("30Y USDA Mortgage Index").get(), // Ensure this path is correct
      ratesCollectionRef.doc("15Y Mortgage Avg US").get(),
    ]);

    const responseData = {};

    const addRateData = (docSnap, keyName) => {
      if (docSnap.exists) {
        const data = docSnap.data();
        const latest = parseFloat(data.latest);
        const lastMonth = parseFloat(data.last_month); // Used for daily_change calc

        let dailyChange = null;
        // Ensure both are valid numbers before calculating change
        if (!isNaN(latest) && !isNaN(lastMonth)) {
            dailyChange = (latest - lastMonth).toFixed(3);
        } else {
            console.warn(`Invalid 'latest' or 'last_month' for ${keyName}. Latest: ${data.latest}, LastMonth: ${data.last_month}`);
        }

        responseData[keyName] = {
          latest: data.latest ?? null,
          latest_date: data.latest_date ?? null,
          // 'yesterday' is not in your Firestore, so it will remain null/undefined from backend
          // The frontend will display '--' for it if the field is expected.
          last_month: data.last_month ?? null,
          last_month_date: data.last_month_date ?? null,
          year_ago: data.year_ago ?? null,
          year_ago_date: data.year_ago_date ?? null,
          daily_change: dailyChange, // This is latest vs last_month
        };

      } else {
        console.warn(`Document for ${keyName} not found.`);
        responseData[keyName] = null;
      }
    };

    addRateData(fixed30YSnap, "fixed30Y");
    addRateData(va30YSnap, "va30Y");
    addRateData(fha30YSnap, "fha30Y");
    addRateData(jumbo30YSnap, "jumbo30Y");
    addRateData(usda30YSnap, "usda30y"); // Match frontend key name 'usda30y'
    addRateData(fixed15YSnap, "fixed15Y");

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
