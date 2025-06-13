const fetch = require("node-fetch");

const SERIES_ID = "MORTGAGE30US"; // ✅ Global constant for clarity

exports.handler = async function(event, context) {
    const fredApiKey = process.env.FRED_API_KEY; // Securely get API key from Netlify Environment Variables

    // ✅ Validate API key before proceeding
    if (!fredApiKey) {
        console.error("❌ Error: FRED_API_KEY is missing from environment variables.");
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Missing FRED API key." })
        };
    }

    // ✅ Construct API URL
    const apiUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${SERIES_ID}&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=1`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        // ✅ Extract the latest observation
        const latestObservation = data.observations && data.observations.length > 0 ? data.observations[0] : null;

        // ✅ Check if observation exists and value is valid
        if (latestObservation && latestObservation.value !== ".") {
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    series_id: SERIES_ID,
                    date: latestObservation.date,
                    value: parseFloat(latestObservation.value) // Convert value to a float
                })
            };
        } else {
            return {
                statusCode: 404,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "No valid data found for MORTGAGE30US." })
            };
        }
    } catch (error) {
        console.error("❌ Error fetching MORTGAGE30US:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Failed to fetch 30-Year Fixed Mortgage Rate",
                error: error.message,
                stack: error.stack // ✅ Includes stack trace for debugging
            })
        };
    }
};
