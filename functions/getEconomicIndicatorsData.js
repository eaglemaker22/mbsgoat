// netlify/functions/getEconomicIndicatorsData.js
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error("Firebase initialization error:", error);
        // Handle the error, perhaps by terminating the function or returning an error response
        throw new Error("Failed to initialize Firebase Admin SDK.");
    }
}

const db = admin.firestore();

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed'
        };
    }

    try {
        const seriesIds = [
            'HOUST', 'PERMIT1', 'HOUST1F', 'RSXFS', 'UMCSENT', 'CSUSHPINSA', 'PERMIT', 'T10YIE', 'T10Y2Y'
        ];

        const economicIndicatorsData = {};

        for (const seriesId of seriesIds) {
            const docRef = db.collection('economic_indicators').doc(seriesId);
            const doc = await docRef.get();

            if (doc.exists) {
                const data = doc.data();
                // Calculate monthly_change if latest and last_month are available
                let monthly_change = null;
                if (data.latest !== undefined && data.last_month !== undefined) {
                    monthly_change = parseFloat((data.latest - data.last_month).toFixed(3)); // toFixed for precision
                    // If it's zero, treat it as null for display purposes or special handling
                    if (monthly_change === 0) monthly_change = null;
                }

                economicIndicatorsData[seriesId] = {
                    latest: data.latest || null,
                    latest_date: data.latest_date || null,
                    last_month: data.last_month || null,
                    last_month_date: data.last_month_date || null,
                    year_ago: data.year_ago || null,
                    year_ago_date: data.year_ago_date || null,
                    monthly_change: monthly_change
                };
            } else {
                console.warn(`Document for seriesId ${seriesId} not found in Firestore.`);
                // Provide default nulls for missing data
                economicIndicatorsData[seriesId] = {
                    latest: null, latest_date: null,
                    last_month: null, last_month_date: null,
                    year_ago: null, year_ago_date: null,
                    monthly_change: null
                };
            }
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(economicIndicatorsData)
        };

    } catch (error) {
        console.error("Error fetching economic indicators:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch economic indicators data.' })
        };
    }
};
