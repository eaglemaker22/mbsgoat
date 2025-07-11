// .netlify/functions/getAllBondData.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Load service account key from environment variable
// Ensure this environment variable is set in your Netlify settings
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let db;

try {
    if (!serviceAccountKey) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
    }
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf8'));

    // Initialize Firebase Admin SDK if not already initialized
    if (!initializeApp.getApps().length) {
        initializeApp({
            credential: cert(serviceAccount)
        });
    }
    db = getFirestore();
    console.log("Firebase initialized successfully.");
} catch (error) {
    console.error("Firebase initialization error:", error);
    // If Firebase initialization fails, set up a handler that returns a 500 error
    // immediately to prevent further execution issues.
    module.exports.handler = async (event, context) => {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Server configuration error: Firebase not initialized." }),
        };
    };
    return; // Exit here if Firebase init failed
}

// Helper to safely format values.
// This function ensures that null or undefined values are returned as null
// and other values are converted to strings.
function formatValue(value) {
    if (value === null || typeof value === 'undefined') {
        return null;
    }
    return String(value);
}

// REVERTED extractBondFields to its simpler form to match prior working output.
// This means High/Low for shadow bonds will likely be null again,
// but it should restore other values if present in Firestore.
function extractBondFields(data, prefix) {
    return {
        change: data[`${prefix}_Daily_Change`] || data[`${prefix}_change`] || null,
        current: data[`${prefix}_Current`] || data[`${prefix}_current`] || null,
        prevClose: data[`${prefix}_PriorDayClose`] || data[`${prefix}_prevClose`] || null,
        open: data[`${prefix}_Open`] || data[`${prefix}_open`] || null,
        high: data[`${prefix}_High`] || null, // Reverted to expect _High
        low: data[`${prefix}_Low`] || null,   // Reverted to expect _Low
        // Other fields like _Close, _Gemini_Change, _Status are not included here
        // to match the structure of the "prior working" JSON output.
    };
}


exports.handler = async (event, context) => {
    if (!db) {
        console.error("Firestore DB not initialized in handler.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Server error: Firestore database not available." }),
        };
    }

    try {
        // Define references to all relevant Firestore documents
        const docRefShadow = db.collection('market_data').document('shadow_bonds');
        const docRefUS10Y = db.collection('market_data').document('us10y_current');
        const docRefUS30Y = db.collection('market_data').document('us30y_current');
        const docRefMBSProducts = db.collection('market_data').document('mbs_products'); 

        // Fetch all documents concurrently using Promise.all
        const [
            docShadowSnapshot,
            docUS10YSnapshot,
            docUS30YSnapshot, // Correct snapshot variable name
            docMBSProductsSnapshot
        ] = await Promise.all([
            docRefShadow.get(),
            docRefUS10Y.get(),
            docRefUS30Y.get(),
            docRefMBSProducts.get()
        ]);

        // Get data from snapshots; if a document doesn't exist, use an empty object
        const shadowData = docShadowSnapshot.exists ? docShadowSnapshot.data() : {};
        const us10yData = docUS10YSnapshot.exists ? docUS10YSnapshot.data() : {};
        // *** CRITICAL FIX: Corrected typo from doc30YSnapshot to docUS30YSnapshot ***
        const us30yData = docUS30YSnapshot.exists ? docUS30YSnapshot.data() : {}; 
        const mbsProductsData = docMBSProductsSnapshot.exists ? docMBSProductsSnapshot.data() : {};

        // Log raw data fetched from Firestore for debugging.
        // These logs are crucial to see if any documents are coming back empty.
        console.log("--- Raw Shadow Data Fetched from Firestore ---");
        console.log(JSON.stringify(shadowData, null, 2));

        console.log("--- Raw US10Y Data Fetched from Firestore ---");
        console.log(JSON.stringify(us10yData, null, 2));

        console.log("--- Raw US30Y Data Fetched from Firestore ---");
        console.log(JSON.stringify(us30yData, null, 2));

        console.log("--- Raw MBS Products Data Fetched from Firestore ---");
        console.log(JSON.stringify(mbsProductsData, null, 2));


        // Extract and process data for each bond type using the helper function
        const umbs55 = extractBondFields(mbsProductsData, 'UMBS_5_5');
        const umbs60 = extractBondFields(mbsProductsData, 'UMBS_6_0');
        const gnma55 = extractBondFields(mbsProductsData, 'GNMA_5_5');
        const gnma60 = extractBondFields(mbsProductsData, 'GNMA_6_0');

        const umbs55Shadow = extractBondFields(shadowData, 'UMBS_5_5_Shadow');
        const umbs60Shadow = extractBondFields(shadowData, 'UMBS_6_0_Shadow');
        const gnma55Shadow = extractBondFields(shadowData, 'GNMA_5_5_Shadow');
        const gnma60Shadow = extractBondFields(shadowData, 'GNMA_6_0_Shadow');

        const us10y = extractBondFields(us10yData, 'US10Y');
        const us30y = extractBondFields(us30yData, 'US30Y');


        // Log extracted data before sending the response
        console.log("--- Extracted Data for UMBS_5_5_Shadow ---");
        console.log(JSON.stringify(umbs55Shadow, null, 2));
        console.log("--- Extracted Data for US10Y ---");
        console.log(JSON.stringify(us10y, null, 2));
        console.log("--- Extracted Data for US30Y ---");
        console.log(JSON.stringify(us30y, null, 2));
        console.log("--- Extracted Data for UMBS_5_5 (non-shadow) ---");
        console.log(JSON.stringify(umbs55, null, 2));


        // Construct the final JSON response, matching the prior "working" structure
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", // Adjust for specific origins in production
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({
                // Get last_updated from any available document, or null if none
                last_updated: shadowData.last_updated || us10yData.last_updated || us30yData.last_updated || mbsProductsData.last_updated || null,
                UMBS_5_5: umbs55,
                UMBS_6_0: umbs60,
                GNMA_5_5: gnma55,
                GNMA_6_0: gnma60,
                UMBS_5_5_Shadow: umbs55Shadow,
                UMBS_6_0_Shadow: umbs60Shadow,
                GNMA_5_5_Shadow: gnma55Shadow,
                GNMA_6_0_Shadow: gnma60Shadow,
                US10Y: us10y,
                US30Y: us30y,
                trading_day_date: shadowData.trading_day_date || null // Get trading_day_date from shadow bonds
            }),
        };
    } catch (error) {
        console.error("Error fetching or processing bond data:", error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ error: "Failed to fetch bond data." }),
        };
    }
};
