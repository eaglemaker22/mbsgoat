// netlify/functions/getLiveStockData.js
const fetch = require('node-fetch'); // Make sure node-fetch is installed (npm install node-fetch)

exports.handler = async function (event, context) {
    const finnhubApiKey = process.env.FINNHUB_API_KEY;

    if (!finnhubApiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Finnhub API key is not set.' }),
        };
    }

    // Get the stock symbols from the query parameters or define them
    // For simplicity, we'll hardcode them here initially, but you could pass them.
    const symbols = ['SPY', 'QQQ', 'DIA']; // S&P 500 ETF, Nasdaq 100 ETF, Dow Jones ETF

    const data = {};

    try {
        for (const symbol of symbols) {
            const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`);
            
            if (!response.ok) {
                console.error(`Finnhub API error for ${symbol}: ${response.statusText}`);
                data[symbol] = null; // Mark as null if fetch fails for this symbol
                continue; // Move to the next symbol
            }
            
            const quote = await response.json();
            
            // Finnhub quote response:
            // { c: current price, h: high, l: low, o: open, pc: previous close, t: timestamp }
            if (quote && quote.c !== undefined && quote.pc !== undefined) {
                const currentPrice = parseFloat(quote.c);
                const previousClose = parseFloat(quote.pc);
                const change = (currentPrice - previousClose);
                const percentChange = (change / previousClose) * 100;

                data[symbol] = {
                    current: currentPrice.toFixed(2),
                    change: change.toFixed(2),
                    percentChange: percentChange.toFixed(2),
                    // You can add more fields if needed:
                    // open: quote.o.toFixed(2),
                    // high: quote.h.toFixed(2),
                    // low: quote.l.toFixed(2),
                    // previousClose: quote.pc.toFixed(2),
                    // timestamp: quote.t // Unix timestamp
                };
            } else {
                 console.warn(`Incomplete data for ${symbol} from Finnhub:`, quote);
                 data[symbol] = null;
            }
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        };

    } catch (error) {
        console.error('Error fetching stock data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch stock data.', details: error.message }),
        };
    }
};
