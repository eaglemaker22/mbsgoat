// netlify/functions/getAllFredData.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Ensuring correct format
    client_email: process.env.FIREBASE_CLIENT_EMAIL
};
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error("Firebase Admin initialization failed:", error);
        throw new Error("Check FIREBASE_SERVICE_ACCOUNT in Netlify environment variables.");
    }
}

const db = admin.firestore();

exports.handler = async function(event, context) {
    try {
        const snapshot = await db.collection('fred_reports').get();

        if (snapshot.empty) {
            console.warn("No FRED reports found in Firestore.");
            return { statusCode: 404, body: JSON.stringify({ message: "No data found." }) };
        }

        let results = {};
        snapshot.forEach(doc => {
            results[doc.id] = doc.data();
        });

        return { statusCode: 200, body: JSON.stringify(results) };
    } catch (error) {
        console.error("Error fetching FRED data:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch FRED data" }) };
    }
};
