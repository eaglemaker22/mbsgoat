const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin SDK initialized for Shadow Bonds.");
    } catch (error) {
        console.error("Firebase Admin initialization failed:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Firebase setup issue." }) };
    }
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    try {
        const docRef = db.collection('market_data').doc('shadow_bonds');
        const doc = await docRef.get();

        if (!doc.exists) {
            console.warn("Shadow Bonds data not found.");
            return { statusCode: 404, body: JSON.stringify({ message: "No Shadow Bonds data available." }) };
        }

        return { statusCode: 200, body: JSON.stringify(doc.data()) };
    } catch (error) {
        console.error("Error fetching Shadow Bonds data:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch Shadow Bonds data." }) };
    }
};
