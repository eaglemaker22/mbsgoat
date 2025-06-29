// netlify/functions/getDailyRatesData.js
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
    const ratesCollectionRef = db.collection("fred_reports");

    // Fetch all relevant documents in parallel
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
      ratesCollectionRef.doc("FHA Mortgage Index").get(), // Assuming 'FHA Mortgage Index' is the correct doc ID
      ratesCollectionRef.doc("30Y Jumbo Mortgage Index").get(),
      ratesCollectionRef.doc("30Y USDA Mortgage Index").get(),
      ratesCollectionRef.doc("15Y Mortgage Avg US").get(),
    ]);

    const responseData = {};
    let latestOverallDate = null; // To find the most recent update time for the section

    const addRateData = (docSnap, keyName) => {
      if (docSnap.exists) {
        const data = docSnap.data();
        responseData[keyName] = {
          latest: data.latest ?? null,
          latest_date: data.latest_date ?? null,
          last_month: data.last_month ?? null,
          last_month_date: data.last_month_date ?? null,
          year_ago: data.year_ago ?? null,
          year_ago_date: data.year_ago_date ?? null,
        };

        // Update the overall latest date if this one is newer
        if (data.latest_date) {
            const currentDate = new Date(data.latest_date);
            if (!latestOverallDate || currentDate > latestOverallDate) {
                latestOverallDate = currentDate;
            }
        }

      } else {
        console.warn(`Document for ${keyName} not found.`);
        responseData[keyName] = null; // Indicate missing data
      }
    };

    addRateData(fixed30YSnap, "fixed30Y");
    addRateData(va30YSnap, "va30Y");
    addRateData(fha30YSnap, "fha30Y");
    addRateData(jumbo30YSnap, "jumbo30Y");
    addRateData(usda30YSnap, "usda30Y");
    addRateData(fixed15YSnap, "fixed15Y");

    // Add the overall latest update date for the section
    if (latestOverallDate) {
        responseData.last_updated = latestOverallDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
    } else {
        responseData.last_updated = null;
    }


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
