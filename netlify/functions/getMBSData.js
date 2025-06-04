// netlify/functions/getMBSData.js
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK ONLY ONCE
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin SDK initialized successfully for MBS data.');
    } catch (error) {
        console.error('Error initializing Firebase Admin SDK for MBS data:', error);
        throw new Error('Firebase initialization failed: ' + error.message);
    }
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    try {
        const mbsRef = db.collection('market_data').document('mbs_products');
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