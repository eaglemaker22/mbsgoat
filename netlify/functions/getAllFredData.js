const admin = require('firebase-admin');
const serviceAccount = require("./firebase-config.json"); // Load credentials

console.log("🔍 Debug: Loaded service account credentials:", JSON.stringify(serviceAccount, null, 2)); // Debugging step

if (!serviceAccount.private_key) {
    console.error("❌ Error: private_key is missing or undefined.");
    process.exit(1); // Stop execution to prevent further errors
}

if (!admin.apps.length) {
    try {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log("✅ Firebase initialized successfully!");
    } catch (error) {
        console.error("❌ Firebase Admin initialization failed:", error);
        process.exit(1);
    }
}

const db = admin.firestore();

module.exports.handler = async (event, context) => {
    try {
        const snapshot = await db.collection('fred_reports').get();

        if (snapshot.empty) {
            console.warn("⚠️ No FRED reports found.");
            return { statusCode: 404, body: JSON.stringify({ message: "No data available." }) };
        }

        const results = {};
        snapshot.forEach(doc => {
            results[doc.id] = doc.data();
        });

        return { statusCode: 200, body: JSON.stringify(results) };
    } catch (error) {
        console.error("❌ Firestore error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Error retrieving data", details: error.message }) };
    }
};
