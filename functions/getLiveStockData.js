// netlify/functions/getLiveStockData.js
const fetch = require('node-fetch'); // Make sure node-fetch is installed (npm install node-fetch)

exports.handler = async function (event, context) {
    const finnhubApiKey = process.env.FINNHUB_API_KEY;

    // Log the event for debugging (optional, remove in production)
    // console.log("Received event:", JSON.stringify(event, null, 2));

    if (!finnhubApiKey) {
        console.error('FINNHUB_API_KEY environment variable is not set.');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Finnhub API key is not configured on the server.' }),
        };
    }

    // Define the stock symbols to fetch.
    // These could also be passed as query parameters from the frontend if needed.
    const symbols = ['SPY', 'QQQ', 'DIA']; // S&P 500 ETF, Nasdaq 100 ETF, Dow Jones ETF

    const data = {};

    try {
        for (const symbol of symbols) {
            const finnhubApiUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`;
            // console.log(`Fetching data for ${symbol} from: ${finnhubApiUrl.replace(finnhubApiKey, 'YOUR_API_KEY_HIDDEN')}`); // For debugging, hide key

            const response = await fetch(finnhubApiUrl);
            
            if (!response.ok) {
                const errorText = await response.text(); // Get raw error text from API
                console.error(`Finnhub API error for ${symbol}: Status ${response.status}, Message: ${errorText}`);
                data[symbol] = null; // Mark as null if fetch fails for this symbol
                continue; // Move to the next symbol
            }
            
            const quote = await response.json();
            
            // Finnhub quote response:
            // { c: current price, h: high, l: low, o: open, pc: previous close, t: timestamp }
            if (quote && quote.c !== undefined && quote.pc !== undefined) {
                const currentPrice = parseFloat(quote.c);
                const previousClose = parseFloat(quote.pc);

                // Handle cases where previousClose might be 0 or null to prevent NaN/Infinity
                let change = null;
                let percentChange = null;

                if (!isNaN(currentPrice) && !isNaN(previousClose) && previousClose !== 0) {
                    change = (currentPrice - previousClose);
                    percentChange = (change / previousClose) * 100;
                } else if (previousClose === 0 && currentPrice !== 0) {
                    // If previous close was 0 but current is not, it's a significant change
                    change = currentPrice;
                    percentChange = 100; // or indicate as N/A or very high
                } else {
                    // Handle cases where data is invalid or both are 0/null
                    change = 0; // Or null if you prefer
                    percentChange = 0; // Or null if you prefer
                }

                data[symbol] = {
                    current: currentPrice.toFixed(2),
                    change: change !== null ? change.toFixed(2) : null,
                    percentChange: percentChange !== null ? percentChange.toFixed(2) : null,
                    // You can add more fields if needed:
                    // open: quote.o !== undefined ? parseFloat(quote.o).toFixed(2) : null,
                    // high: quote.h !== undefined ? parseFloat(quote.h).toFixed(2) : null,
                    // low: quote.l !== undefined ? parseFloat(quote.l).toFixed(2) : null,
                    // previousClose: quote.pc !== undefined ? parseFloat(quote.pc).toFixed(2) : null,
                    // timestamp: quote.t // Unix timestamp
                };
            } else {
                 console.warn(`Incomplete or malformed data for ${symbol} from Finnhub:`, quote);
                 data[symbol] = null; // Set to null if essential fields are missing
            }
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        };

    } catch (error) {
        console.error('Error in getLiveStockData function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch stock data.', details: error.message }),
        };
    }
};
