const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const serviceAccount = require("./firebase-config.json"); // ✅ Correct path

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized successfully.");
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed Firebase initialization." }) };
    }
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    try {
        const docRef = db.collection('market_data').doc('mbs_products');
        const doc = await docRef.get();

        if (!doc.exists) {
            console.warn("MBS products not found in Firestore.");
            return { statusCode: 404, body: JSON.stringify({ message: "No MBS data found." }) };
        }

        return { statusCode: 200, body: JSON.stringify(doc.data()) };
    } catch (error) {
        console.error("Error fetching MBS data:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch MBS data" }) };
    }
};
