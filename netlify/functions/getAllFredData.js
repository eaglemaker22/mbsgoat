// netlify/functions/getFredReport.js
// This Netlify Function fetches specific FRED report data from your Firestore database
// based on the 'reportName' query parameter.

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
        throw new Error("Failed to initialize Firebase Admin. Check FIREBASE_SERVICE_ACCOUNT environment variable.");
    }
}

const db = admin.firestore(); // Get Firestore instance

exports.handler = async function(event, context) {
    // Get the reportName from the query parameters
    const reportName = event.queryStringParameters.reportName;

    if (!reportName) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Missing 'reportName' query parameter." })
        };
    }

    try {
        // Reference to the specific document in Firestore's 'fred_reports' collection
        const docRef = db.collection('fred_reports').document(reportName);
        const doc = await docRef.get();

        if (!doc.exists) {
            console.warn(`No such document: fred_reports/${reportName}`);
            return {
                statusCode: 404,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: `FRED report '${reportName}' not found in Firestore.` })
            };
        }

        const data = doc.data(); // Get all data from the document

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        };
    } catch (error) {
        console.error(`Error fetching FRED report '${reportName}' from Firestore:`, error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: `Failed to fetch FRED report '${reportName}'.`, error: error.message })
        };
    }
};
