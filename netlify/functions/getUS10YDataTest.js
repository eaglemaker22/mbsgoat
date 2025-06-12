// netlify/functions/getUS10YDataTest.cjs
// This Netlify Function fetches US10Y data from your Firestore database for proof-of-concept.

const admin = require('firebase-admin'); // Import Firebase Admin SDK

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error("Firebase Admin initialization error:", e);
        // Throw an error during initialization so Netlify logs it clearly
        throw new Error("Failed to initialize Firebase Admin. Check FIREBASE_SERVICE_ACCOUNT environment variable is valid JSON.");
    }
}

const db = admin.firestore(); // Get Firestore instance

exports.handler = async function(event, context) {
    console.log("getUS10YDataTest function invoked."); // Log function start
    try {
        // Reference to the specific document in Firestore where US10Y data is stored
        const docRef = db.collection('market_data').document('us10y_current');
        const doc = await docRef.get();

        if (!doc.exists) {
            console.warn("Firestore document 'market_data/us10y_current' not found.");
            return {
                statusCode: 404,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "US10Y data document not found in Firestore. Check path and scraper." })
            };
        }

        const data = doc.data(); // Get all data from the document
        console.log("Data retrieved from Firestore:", JSON.stringify(data));

        // Return only the relevant fields
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                US10Y_Current: data.US10Y_Current, // Ensure your Python scraper writes this exact key
                last_updated: data.last_updated // Ensure your Python scraper writes this exact key
            })
        };
    } catch (error) {
        console.error("Error fetching US10Y data from Firestore:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Failed to fetch US10Y data from Firestore.", error: error.message })
        };
    }
};
