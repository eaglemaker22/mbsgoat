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
