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
        console.log('Firebase Admin SDK initialized successfully for Shadow Bonds data.');
    } catch (e) {
        console.error("Firebase Admin SDK initialization failed for Shadow Bonds data:", e);
        return { statusCode: 500, body: JSON.stringify({ error: "Server initialization error: Firebase Admin SDK failed to initialize." }) };
    }
}

// Get the Firestore database instance
const db = admin.firestore(); // Correctly get the Firestore client

exports.handler = async (event, context) => {
    try {
        // UNIQUE PART: Reference to the 'shadow_bonds' document
        const shadowBondsRef = db.collection('market_data').doc('shadow_bonds');
        const doc = await shadowBondsRef.get();

        if (!doc.exists) {
            console.log('No Shadow Bonds document found!');
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Shadow Bonds data not found' }),
            };
        }

        const data = doc.data();
        console.log('Fetched Shadow Bonds data:', data);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('Error fetching Shadow Bonds data from Firestore:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to fetch Shadow Bonds data', details: error.message }),
        };
    }
};
