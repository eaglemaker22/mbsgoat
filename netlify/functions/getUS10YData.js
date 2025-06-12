const admin = require('firebase-admin');

// Ensure the Firebase Admin SDK is initialized only once.
if (!admin.apps.length) {
    let serviceAccount;
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (e) {
        console.error("FIREBASE_SERVICE_ACCOUNT_KEY parsing error:", e);
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error: Invalid Firebase service account key." }) };
    }

    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin SDK initialized successfully for US10Y data.');
    } catch (e) {
        console.error("Firebase Admin SDK initialization failed for US10Y data:", e);
        return { statusCode: 500, body: JSON.stringify({ error: "Server initialization error: Firebase Admin SDK failed to initialize." }) };
    }
}

// Get the Firestore database instance
const db = admin.firestore(); // Correctly get the Firestore client

exports.handler = async (event, context) => {
    try {
        // UNIQUE PART: Reference to the 'us10y_current' document
        const us10yRef = db.collection('market_data').doc('us10y_current');
        const doc = await us10yRef.get();

        if (!doc.exists) {
            console.log('No US10Y document found!');
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'US10Y data not found' }),
            };
        }

        const data = doc.data();
        console.log('Fetched US10Y data:', data);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('Error fetching US10Y data from Firestore:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to fetch US10Y data', details: error.message }),
        };
    }
};
