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
    // Exit the function gracefully if initialization fails
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


function extractBondFields(data, prefix) {
    // Use || for fallbacks if field names vary (e.g., Daily_Change vs change)
    // Adapting to your current Firestore data field names
    const change = data[`${prefix}_Daily_Change`] || data[`${prefix}_change`] || null;
    const current = data[`${prefix}_Current`] || data[`${prefix}_current`] || null;
    const prevClose = data[`${prefix}_PriorDayClose`] || data[`${prefix}_prevClose`] || null;
    const open = data[`${prefix}_Open`] || data[`${prefix}_open`] || null;
    // *** CRITICAL CHANGE: Look for _TodayHigh and _TodayLow first ***
    const high = data[`${prefix}_TodayHigh`] || data[`${prefix}_High`] || null;
    const low = data[`${prefix}_TodayLow`] || data[`${prefix}_Low`] || null;
    const close = data[`${prefix}_Close`] || null; // Adding the _Close field based on your scrape output

    // Including other new fields from your Firestore data
    const geminiChange = data[`${prefix}_Gemini_Change`] || null;
    const status = data[`${prefix}_Status`] || null;


    return {
        change: formatValue(change),
        current: formatValue(current),
        prevClose: formatValue(prevClose),
        open: formatValue(open),
        high: formatValue(high),
        low: formatValue(low),
        // Include new fields from the user's Firestore output
        close: formatValue(close),
        geminiChange: formatValue(geminiChange),
        status: status // Status is already string, no need to formatValue
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
        const docRefShadow = db.collection('market_data').document('shadow_bonds');
        const docRefUS10Y = db.collection('market_data').document('us10y_current');
        const docRefUS30Y = db.collection('market_data').document('us30y_current');
        // Assuming this document exists and contains UMBS_5_5, GNMA_5_5 etc.
        const docRefMBSProducts = db.collection('market_data').document('mbs_products');

        const [
            docShadowSnapshot,
            docUS10YSnapshot,
            docUS30YSnapshot,
            docMBSProductsSnapshot
        ] = await Promise.all([
            docRefShadow.get(),
            docRefUS10Y.get(),
            docRefUS30Y.get(),
            docRefMBSProducts.get()
        ]);

        const shadowData = docShadowSnapshot.exists ? docShadowSnapshot.data() : {};
        const us10yData = docUS10YSnapshot.exists ? docUS10YSnapshot.data() : {};
        const us30yData = docUS30YSnapshot.exists ? doc30YSnapshot.data() : {}; // Corrected typo here to us30yData
        const mbsProductsData = docMBSProductsSnapshot.exists ? docMBSProductsSnapshot.data() : {};

        console.log("--- Raw Shadow Data Fetched from Firestore ---");
        console.log(JSON.stringify(shadowData, null, 2));

        console.log("--- Raw US10Y Data Fetched from Firestore ---");
        console.log(JSON.stringify(us10yData, null, 2));

        console.log("--- Raw US30Y Data Fetched from Firestore ---");
        console.log(JSON.stringify(us30yData, null, 2));

        console.log("--- Raw MBS Products Data Fetched from Firestore ---");
        console.log(JSON.stringify(mbsProductsData, null, 2));


        // Extract and process data for each bond type
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


        // Log extracted data for debugging
        console.log("--- Extracted Data for UMBS_5_5_Shadow ---");
        console.log(JSON.stringify(umbs55Shadow, null, 2));
        console.log("--- Extracted Data for US10Y ---");
        console.log(JSON.stringify(us10y, null, 2));


        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({
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
                trading_day_date: shadowData.trading_day_date || null
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
