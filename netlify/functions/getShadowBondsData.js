// netlify/functions/getShadowBondsData.js
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK ONLY ONCE
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin SDK initialized successfully for Shadow Bonds data.');
    } catch (error) {
        console.error('Error initializing Firebase Admin SDK for Shadow Bonds data:', error);
        throw new Error('Firebase initialization failed: ' + error.message);
    }
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    try {
        const shadowBondsRef = db.collection('market_data').document('shadow_bonds');
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
