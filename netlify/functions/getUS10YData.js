// netlify/functions/getUS10YData.js

const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

exports.handler = async function(event, context) {
  try {
    const snapshot = await db.collection('bonds_for_umbs')
                              .orderBy('timestamp', 'desc')
                              .limit(1)
                              .get();

    if (snapshot.empty) {
      console.warn("No documents found in 'bonds_for_umbs' collection.");
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No bonds_for_umbs data found in Firestore' }),
      };
    }

    const latestDoc = snapshot.docs[0];
    const data = latestDoc.data();

    // Return only the current US10Y/US30Y values and their specific timestamp
    return {
      statusCode: 200,
      body: JSON.stringify({
          US10Y_Current: data.US10Y, // This is the current yield from TradingView
          US30Y_Current: data.US30Y, // Current 30Y yield
          timestamp_us10y: data.timestamp // This will be the timestamp for these specific values
      }),
    };
  } catch (error) {
    console.error("Function error in getUS10YData:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'An unexpected error occurred in getUS10YData' }),
    };
  }
};