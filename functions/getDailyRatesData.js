// netlify/functions/getDailyRatesData.js
// NO CHANGES NEEDED FOR THIS FILE FROM PREVIOUS RESPONSE.
// It already calculates daily_change and returns latest, last_month, year_ago.
// It will not return a 'yesterday' field unless your Firestore documents have one.

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
      ratesCollectionRef.doc("30Y USDA Mortgage Index").get(),
      ratesCollectionRef.doc("15Y Mortgage Avg US").get(),
    ]);

    const responseData = {};

    const addRateData = (docSnap, keyName) => {
      if (docSnap.exists) {
        const data = docSnap.data();
        const latest = parseFloat(data.latest);
        const lastMonth = parseFloat(data.last_month); // Used for daily_change calc

        let dailyChange = null;
        if (!isNaN(latest) && !isNaN(lastMonth)) {
            dailyChange = (latest - lastMonth).toFixed(3);
        }

        responseData[keyName] = {
          latest: data.latest ?? null,
          latest_date: data.latest_date ?? null,
          // If you ever implement a 'yesterday' field in Firestore, it would be added here:
          // yesterday: data.yesterday ?? null,
          last_month: data.last_month ?? null,
          last_month_date: data.last_month_date ?? null,
          year_ago: data.year_ago ?? null,
          year_ago_date: data.year_ago_date ?? null,
          daily_change: dailyChange,
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
    addRateData(usda30YSnap, "usda30Y");
    addRateData(fixed15YSnap, "fixed15Y");

    return {
      statusCode: 200,
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
