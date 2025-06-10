// netlify/functions/getMortgage30US.js
// Fetches the 30-Year Fixed Mortgage Rate from FRED.

exports.handler = async function(event, context) {
    const fredApiKey = process.env.FRED_API_KEY; // Securely get API key from Netlify Environment Variables
    const seriesId = 'MORTGAGE30US';
    // limit=1 to get just the latest observation, sort_order=desc to ensure it's the most recent
    const apiUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=1`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            // Throw an error if the HTTP response status is not 2xx
            throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        // Extract the latest observation
        const latestObservation = data.observations && data.observations.length > 0 ? data.observations[0] : null;

        // Check if observation exists and value is not the placeholder '.'
        if (latestObservation && latestObservation.value !== '.') {
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    series_id: seriesId,
                    date: latestObservation.date,
                    value: parseFloat(latestObservation.value) // Convert value to a float
                })
            };
        } else {
            // Handle cases where no valid data is found
            return {
                statusCode: 404,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "No valid data found for MORTGAGE30US." })
            };
        }
    } catch (error) {
        console.error("Error fetching MORTGAGE30US:", error);
        return {
            statusCode: 500, // Internal server error
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Failed to fetch 30-Year Fixed Mortgage Rate", error: error.message })
        };
    }
};

// netlify/functions/getRetailSales.js
// Fetches Retail Sales data (RSAFS) from FRED.

exports.handler = async function(event, context) {
    const fredApiKey = process.env.FRED_API_KEY; // Securely get API key
    const seriesId = 'RSAFS'; // Retail and Food Services Sales
    const apiUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=1`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        const latestObservation = data.observations && data.observations.length > 0 ? data.observations[0] : null;

        if (latestObservation && latestObservation.value !== '.') {
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    series_id: seriesId,
                    date: latestObservation.date,
                    value: parseFloat(latestObservation.value)
                })
            };
        } else {
            return {
                statusCode: 404,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "No valid data found for RSAFS." })
            };
        }
    } catch (error) {
        console.error("Error fetching Retail Sales:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Failed to fetch Retail Sales data", error: error.message })
        };
    }
};

// netlify/functions/getConsumerSentiment.js
// Fetches Consumer Sentiment data (UMCSENT) from FRED.

exports.handler = async function(event, context) {
    const fredApiKey = process.env.FRED_API_KEY; // Securely get API key
    const seriesId = 'UMCSENT'; // University of Michigan Consumer Sentiment
    const apiUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=1`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        const latestObservation = data.observations && data.observations.length > 0 ? data.observations[0] : null;

        if (latestObservation && latestObservation.value !== '.') {
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    series_id: seriesId,
                    date: latestObservation.date,
                    value: parseFloat(latestObservation.value)
                })
            };
        } else {
            return {
                statusCode: 404,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "No valid data found for UMCSENT." })
            };
        }
    } catch (error) {
        console.error("Error fetching Consumer Sentiment:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Failed to fetch Consumer Sentiment data", error: error.message })
        };
    }
};
