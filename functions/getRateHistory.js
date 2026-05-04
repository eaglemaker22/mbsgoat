const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// Maps chart source:product keys to FRED series IDs in fred_history
const SERIES_MAP = {
  'mcr:30Y CONV':    'OBMMIC30YF',
  'mcr:15Y CONV':    'OBMMIC15YF',
  'mcr:30Y FHA':     'OBMMIFHA30YF',
  'mcr:30Y VA':      'OBMMIVA30YF',
  'mcr:30Y JUMBO':   'OBMMIJUMBO30YF',
  'freddie:30Y CONV':'MORTGAGE30US',
  'freddie:15Y CONV':'MORTGAGE15US',
};

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type':                 'application/json',
    'Cache-Control':                'public, max-age=900', // 15 min cache — data only changes at 4:30 PM
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Optional: ?source=mcr&product=30Y+CONV to get a single series
  // Without params: returns all series (used to pre-cache on page load)
  const { source, product } = event.queryStringParameters || {};

  try {
    const snap = await db.collection('market_data').doc('fred_history').get();

    if (!snap.exists) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ series: {}, error: 'fred_history not yet populated' }),
      };
    }

    const raw = snap.data();

    // Build response — filter to requested series or return all
    const series = {};

    for (const [chartKey, seriesId] of Object.entries(SERIES_MAP)) {
      // If caller asked for a specific source+product, skip others
      if (source && product) {
        const requestedKey = `${source}:${product}`;
        if (chartKey !== requestedKey) continue;
      }

      const entry = raw[seriesId];
      if (!entry || !entry.observations) continue;

      // Observations are oldest-first from the scraper.
      // Trim to last 30 data points for the chart.
      const obs = entry.observations.slice(-30);

      series[chartKey] = {
        label:        entry.label || seriesId,
        dates:        obs.map(o => o.date),
        values:       obs.map(o => o.value),
        last_updated: entry.last_updated || null,
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ series }),
    };

  } catch (err) {
    console.error('getRateHistory error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
