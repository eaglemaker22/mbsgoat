const admin = require('firebase-admin');

// Load Firebase service account credentials
const serviceAccount = require("./firebase-config.json"); // ✅ Updated path for Netlify

console.log("🔍 Debug: Checking Firebase credentials:", JSON.stringify(serviceAccount, null, 2));

if (!serviceAccount.private_key) {
    console.error("❌ Error: Missing private_key in firebase-config.json.");
    process.exit(1); // Stop execution if credentials are missing
}

// Initialize Firebase only if not already initialized
if (!admin.apps.length) {
    try {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log("✅ Firebase initialized successfully!");
    } catch (error) {
        console.error("❌ Firebase initialization failed:", error);
        process.exit(1);
    }
}

// Get Firestore database reference
const db = admin.firestore();

// Netlify function handler
exports.handler = async (event, context) => {
    try {
        // Validate Firestore connection before proceeding
        if (!db) {
            console.error("❌ Error: Firestore not initialized.");
            return { statusCode: 500, body: JSON.stringify({ error: "Firestore connection failed." }) };
        }

        // Fetch data from Firestore
        const docRef = db.collection('market_data').doc('mbs_products');
        const doc = await docRef.get();

        if (!doc.exists) {
            console.warn("⚠️ No MBS products found in Firestore.");
            return { statusCode: 404, body: JSON.stringify({ message: "No MBS data available." }) };
        }

        return { statusCode: 200, body: JSON.stringify(doc.data()) };
    } catch (error) {
        console.error("❌ Firestore query error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch MBS data", details: error.message }) };
    }
};
