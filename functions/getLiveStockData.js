// netlify/functions/getLiveStockData.js
const fetch = require('node-fetch');

exports.handler = async function (event, context) {
    const finnhubApiKey = process.env.FINNHUB_API_KEY;

    if (!finnhubApiKey) {
        console.error('FINNHUB_API_KEY environment variable is not set.');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Finnhub API key is not configured on the server.' }),
        };
    }

    // Define the stock symbols to fetch.
    const symbols = ['SPY', 'QQQ', 'DIA']; // S&P 500 ETF, Nasdaq 100 ETF, Dow Jones ETF

    const data = {};

    try {
        for (const symbol of symbols) {
            const finnhubApiUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`;
            const response = await fetch(finnhubApiUrl);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Finnhub API error for ${symbol}: Status ${response.status}, Message: ${errorText}`);
                data[symbol] = null;
                continue;
            }

            const quote = await response.json();

            // Finnhub quote response fields:
            // c: current price
            // h: high price of the day
            // l: low price of the day
            // o: open price of the day  <-- We need this one!
            // pc: previous close price
            // t: timestamp
            if (quote && quote.c !== undefined && quote.o !== undefined) { // Check for 'c' and 'o'
                const currentPrice = parseFloat(quote.c);
                const openPrice = parseFloat(quote.o); // Get the open price

                let changeSinceOpen = null;
                if (!isNaN(currentPrice) && !isNaN(openPrice)) {
                    changeSinceOpen = (currentPrice - openPrice);
                }

                data[symbol] = {
                    current: currentPrice.toFixed(2),
                    changeSinceOpen: changeSinceOpen !== null ? changeSinceOpen.toFixed(2) : null, // New field for change since open
                    // You can keep or remove other fields if you don't need them for the frontend,
                    // but it's safer to include them if the frontend might want them later.
                    // previousClose: quote.pc !== undefined ? parseFloat(quote.pc).toFixed(2) : null,
                    // open: openPrice.toFixed(2), // You might not need to send 'open' back if only the change is displayed
                };
            } else {
                 console.warn(`Incomplete or malformed data for ${symbol} from Finnhub (missing current or open price):`, quote);
                 data[symbol] = null;
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
