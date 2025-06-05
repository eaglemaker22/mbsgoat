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
        console.log('Firebase Admin SDK initialized successfully for MBS data.');
    } catch (e) {
        console.error('Error initializing Firebase Admin SDK for MBS data:', error);
        return { statusCode: 500, body: JSON.stringify({ error: "Server initialization error: Firebase Admin SDK failed to initialize." }) };
    }
}

// Get the Firestore database instance
const db = admin.firestore(); // Correctly get the Firestore client

exports.handler = async (event, context) => {
    try {
        // UNIQUE PART: Reference to the 'mbs_products' document
        const mbsRef = db.collection('market_data').doc('mbs_products');
        const doc = await mbsRef.get();

        if (!doc.exists) {
            console.log('No MBS products document found!');
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'MBS products data not found' }),
            };
        }

        const data = doc.data();
        console.log('Fetched MBS data:', data);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('Error fetching MBS data from Firestore:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to fetch MBS data', details: error.message }),
        };
    }
};
