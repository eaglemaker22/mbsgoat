const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const serviceAccount = {
            type: "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fixes formatting
            client_email: process.env.FIREBASE_CLIENT_EMAIL
        };

        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (error) {
        console.error("Firebase Admin initialization failed:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Firebase initialization failed", details: error.message })
        };
    }
}

const db = admin.firestore();

exports.handler = async function(event, context) {
    try {
        const snapshot = await db.collection('fred_reports').get();

        if (snapshot.empty) {
            console.warn("No FRED reports found.");
            return { statusCode: 404, body: JSON.stringify({ message: "No data available." }) };
        }

        const results = {};
        snapshot.forEach(doc => {
            results[doc.id] = doc.data();
        });

        return { statusCode: 200, body: JSON.stringify(results) };
    } catch (error) {
        console.error("Firestore error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Error retrieving data", details: error.message }) };
    }
};
