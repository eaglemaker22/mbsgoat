const admin = require("firebase-admin");
const serviceAccount = require("../../firebase-config.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

exports.handler = async function(event, context) {
  try {
    const mbsDoc = await db.collection("market_data").doc("mbs_products").get();
    const shadowDoc = await db.collection("market_data").doc("shadow_bonds").get();

    const mbsData = mbsDoc.data();
    const shadowData = shadowDoc.data();

    const result = {
      UMBS_5_5: {
        change: mbsData?.UMBS_5_5_Daily_Change || null,
        current: mbsData?.UMBS_5_5_Current || null,
        prevClose: mbsData?.UMBS_5_5_Close || null,
        open: mbsData?.UMBS_5_5_Open || null,
        high: mbsData?.UMBS_5_5_TodayHigh || null,
        low: mbsData?.UMBS_5_5_TodayLow || null
      },
      UMBS_5_5_Shadow: {
        change: shadowData?.UMBS_5_5_Shadow_Daily_Change || null,
        current: shadowData?.UMBS_5_5_Shadow_Current || null,
        prevClose: shadowData?.UMBS_5_5_Shadow_PriorDayClose || null,
        open: shadowData?.UMBS_5_5_Shadow_Open || null,
        high: shadowData?.UMBS_5_5_Shadow_TodayHigh || null,
        low: shadowData?.UMBS_5_5_Shadow_TodayLow || null
      }
    };

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (err) {
    console.error("getAllBondData error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch bond data" })
    };
  }
};
