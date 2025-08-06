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

    // Expanded list of symbols
    const symbols = [
        'SPY',          // S&P 500 ETF
        'QQQ',          // Nasdaq 100 ETF
        'DIA',          // Dow Jones ETF
        'BINANCE:BTCUSDT', // Bitcoin (USD) from Binance
        'VXST',         // Volatility Index
        'UUP'      // US Dollar Index
    ];

    const data = {};

    try {
        for (const symbol of symbols) {
            const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${finnhubApiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Finnhub API error for ${symbol}: Status ${response.status}, Message: ${errorText}`);
                data[symbol] = null;
                continue;
            }

            const quote = await response.json();
            if (quote && quote.c !== undefined && quote.pc !== undefined) {
                const current = parseFloat(quote.c);
                const previousClose = parseFloat(quote.pc);

                let change = null;
                let percentChange = null;

                if (!isNaN(current) && !isNaN(previousClose) && previousClose !== 0) {
                    change = current - previousClose;
                    percentChange = (change / previousClose) * 100;
                }

                data[symbol] = {
                    current: current.toFixed(2),
                    change: change !== null ? change.toFixed(2) : null,
                    percentChange: percentChange !== null ? percentChange.toFixed(2) + '%' : null,
                };
            } else {
                console.warn(`Incomplete data for ${symbol}`, quote);
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
