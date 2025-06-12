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
        console.log("Firebase Admin SDK initialized for US10Y data.");
    } catch (error) {
        console.error("Firebase Admin initialization failed:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Firebase setup issue." }) };
    }
}

const db = admin.firestore();

module.exports.handler = async (event, context) => {
    try {
        const docRef = db.collection('market_data').doc('us10y_current');
        const doc = await docRef.get();

        if (!doc.exists) {
            console.warn("US10Y data not found.");
            return { statusCode: 404, body: JSON.stringify({ message: "No US10Y data available." }) };
        }

        return { statusCode: 200, body: JSON.stringify(doc.data()) };
    } catch (error) {
        console.error("Error fetching US10Y data:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch US10Y data." }) };
    }
};
