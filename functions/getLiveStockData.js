const fetch = require('node-fetch');

let cache = { data: null, fetchedAt: 0 };
const TTL_MS = 60 * 1000;

exports.handler = async function (event, context) {
  const finnhubApiKey = process.env.FINNHUB_API_KEY;
  if (!finnhubApiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Finnhub API key is not configured on the server.' }),
    };
  }

  const now = Date.now();
  if (cache.data && (now - cache.fetchedAt) < TTL_MS) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(cache.data),
    };
  }

  const symbols = ['SPY', 'QQQ', 'DIA', 'BINANCE:BTCUSDT', 'UVXY', 'UUP'];

  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${finnhubApiKey}`;
          const response = await fetch(url);
          if (!response.ok) {
            console.error(`Finnhub error for ${symbol}: ${response.status}`);
            return [symbol, null];
          }
          const quote = await response.json();
          const current = parseFloat(quote.c);
          const previousClose = parseFloat(quote.pc);
          if (!current || !previousClose || current === 0) {
            console.warn(`Invalid quote for ${symbol}`, quote);
            return [symbol, null];
          }
          const change = current - previousClose;
          const percentChange = (change / previousClose) * 100;
          return [symbol, {
            current: current.toFixed(2),
            change: change.toFixed(2),
            percentChange: percentChange.toFixed(2) + '%',
          }];
        } catch (err) {
          console.error(`Fetch failed for ${symbol}:`, err.message);
          return [symbol, null];
        }
      })
    );

    const data = Object.fromEntries(results);
    cache = { data, fetchedAt: now };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
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
