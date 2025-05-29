// netlify/functions/getData.js (working version for US10Y)

const admin = require('firebase-admin');

exports.handler = async function(event, context) {
  try {
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    let serviceAccount;

    try {
      serviceAccount = JSON.parse(rawServiceAccount);
    } catch (parseError) {
      console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:", parseError);
      console.error("Raw key value:", rawServiceAccount);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error parsing Firebase service account key" }),
      };
    }

    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    const db = admin.firestore();
    const collectionRef = db.collection('bonds_for_umbs'); // **REPLACE IF NEEDED**

    // Query for the most recent document, ordered by timestamp (descending)
    const snapshot = await collectionRef.orderBy('timestamp', 'desc').limit(1).get();

    if (snapshot.empty) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No documents found' }),
      };
    }

    const doc = snapshot.docs[0]; // Get the first (and only) document
    const data = doc.data();

    const us10yValue = data.US10Y;
    const timestamp = data.timestamp; // Assuming you have a timestamp field

    return {
      statusCode: 200,
      body: JSON.stringify({ US10Y: us10yValue, timestamp: timestamp }),
    };

  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
    };
  }
};
