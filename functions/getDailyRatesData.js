// netlify/functions/getDailyRatesData.js
const admin = require('firebase-admin');

// Initialize Firebase Admin only if it hasn't been initialized
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });
    } catch (e) {
        console.error("Firebase initialization error:", e);
        // This will cause the function to fail on initialization
    }
}

const db = admin.database();

exports.handler = async function (event, context) {
    try {
        const ratesRef = db.ref('LockMVP/fred_reports'); // Adjust this path if 'fred_reports' is not directly under LockMVP

        const snapshot = await ratesRef.once('value');
        const fredReports = snapshot.val();

        // Helper function to safely extract data and calculate daily_change
        function extractRateData(path) {
            const data = fredReports[path];
            if (!data) {
                console.warn(`No data found for path: ${path}`);
                return null;
            }

            const latest = parseFloat(data.latest);
            const yesterday = parseFloat(data.yesterday); // Assuming 'yesterday' key exists

            let daily_change = null;
            if (!isNaN(latest) && !isNaN(yesterday)) {
                daily_change = (latest - yesterday).toFixed(3);
            } else {
                console.warn(`Invalid numeric data for daily_change in path: ${path}`);
            }

            return {
                latest: latest.toFixed(3),
                latest_date: data.latest_date || null,
                yesterday: yesterday.toFixed(3),
                last_month: parseFloat(data.last_month).toFixed(3),
                year_ago: parseFloat(data.year_ago).toFixed(3),
                daily_change: daily_change
            };
        }

        const dailyRates = {
            fixed30Y: extractRateData('30Y Fixed Mortgage Index'),
            va30Y: extractRateData('30Y VA Mortgage Index'),
            fha30Y: extractRateData('30Y FHA Mortgage Index'),
            jumbo30Y: extractRateData('30Y Jumbo Mortgage Index'),
            // UPDATED: Explicitly target "30Y USDA Mortgage Index" for USDA
            usda30y: extractRateData('30Y USDA Mortgage Index'),
            fixed15Y: extractRateData('15Y Fixed Mortgage Index'),
        };

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(dailyRates),
        };

    } catch (error) {
        console.error("Error fetching daily rates data from Firebase:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch daily rates data", details: error.message }),
        };
    }
};
