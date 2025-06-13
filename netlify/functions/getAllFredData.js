const admin = require('firebase-admin');
const serviceAccount = require("../private/firebase-config.json"); // Ensure correct path

console.log("Loaded service account:", serviceAccount); // 🛠 Debugging step

if (!admin.apps.length) {
    try {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log("Firebase initialized successfully!");
    } catch (error) {
        console.error("Firebase Admin initialization failed:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Firebase initialization failed", details: error.message })
        };
    }
}

const db = admin.firestore();

module.exports.handler = async (event, context) => {
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
