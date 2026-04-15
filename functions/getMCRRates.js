const https = require('https');

const FRED_SERIES = [
  { id: 'OBMMIC30YF',      product: '30Y CONV'  },
  { id: 'OBMMIFHA30YF',    product: '30Y FHA'   },
  { id: 'OBMMIVA30YF',     product: '30Y VA'    },
  { id: 'OBMMIJUMBO30YF',  product: '30Y JUMBO' },
  { id: 'OBMMIC15YF',      product: '15Y CONV'  },
];

function fredFetch(seriesId, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=2`;
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'FRED_API_KEY not set' }) };
  }

  try {
    const results = await Promise.all(
      FRED_SERIES.map(s => fredFetch(s.id, apiKey).then(data => ({ ...s, data })))
    );

    let asOf = '';
    const rates = results.map(({ product, data }) => {
      const obs = data.observations || [];
      const latest = obs.find(o => o.value !== '.');
      const prev   = obs.find((o, i) => i > 0 && o.value !== '.');
      const rate   = latest ? parseFloat(latest.value) : null;
      const prevRate = prev ? parseFloat(prev.value) : null;
      const change = (rate !== null && prevRate !== null)
        ? Math.round((rate - prevRate) * 1000) / 1000
        : 0;
      if (latest && !asOf) asOf = latest.date;
      return { product, rate, change };
    }).filter(r => r.rate !== null);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ rates, as_of: asOf, source: 'FRED/OBMMI' }),
    };

  } catch (err) {
    console.error('getMCRRates error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
