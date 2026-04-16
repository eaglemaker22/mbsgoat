/**
 * getIntradayHistory.js
 * ---------------------
 * Netlify Function — serves intraday time series for LockIQ charts.
 * Reads from: intraday_history/{date}/snapshots/*
 *
 * Returns both bond (TV_FH) and MBS (MBSLive) series in one call.
 * If either scraper is down, that array is empty — frontend handles gracefully.
 *
 * Query params:
 *   ?date=2026-04-15   (optional — defaults to today ET)
 *
 * Deploy to: netlify/functions/getIntradayHistory.js
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:    process.env.FIREBASE_PROJECT_ID,
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

/* Get today's date in ET (handles EST/EDT automatically) */
function todayET() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type':                 'application/json',
    'Cache-Control':                'no-store',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const dateStr = event.queryStringParameters?.date || todayET();

    /* Load all snapshots for the day, ordered by time */
    const snapshotsRef = db
      .collection('intraday_history')
      .doc(dateStr)
      .collection('snapshots')
      .orderBy('time_str', 'asc');

    const snap = await snapshotsRef.get();

    const bonds = [];
    const mbs   = [];

    snap.forEach(doc => {
      const d = doc.data();

      if (d.source === 'lockiq_TV_FH') {
        bonds.push({
          time:                   d.timestamp_utc,
          time_str:               d.time_str,
          us10y:                  d.us10y          ?? null,
          us30y:                  d.us30y          ?? null,
          zn_decimal:             d.zn_decimal     ?? null,
          mbb_price:              d.mbb_price      ?? null,
          us10y_open:             d.us10y_open     ?? null,
          zn_open:                d.zn_open        ?? null,
          mbb_open:               d.mbb_open       ?? null,
          delta_10y:              d.delta_10y      ?? null,
          delta_zn_ticks:         d.delta_zn_ticks ?? null,
          delta_mbb:              d.delta_mbb      ?? null,
          predicted_umbs55_ticks: d.predicted_umbs55_ticks ?? null,
        });
      }

      if (d.source === 'lockiq_MBSLive') {
        mbs.push({
          time:            d.timestamp_utc,
          time_str:        d.time_str,
          UMBS_5_5:        d.UMBS_5_5_Current      ?? null,
          UMBS_5_5_change: d.UMBS_5_5_Daily_Change ?? null,
          UMBS_5_5_open:   d.UMBS_5_5_Open         ?? null,
          UMBS_5_5_high:   d.UMBS_5_5_TodayHigh    ?? null,
          UMBS_5_5_low:    d.UMBS_5_5_TodayLow     ?? null,
          UMBS_6_0:        d.UMBS_6_0_Current      ?? null,
          UMBS_6_0_change: d.UMBS_6_0_Daily_Change ?? null,
          UMBS_6_0_open:   d.UMBS_6_0_Open         ?? null,
          UMBS_5_0:        d.UMBS_5_0_Current      ?? null,
          GNMA_6_0:        d.GNMA_6_0_Current      ?? null,
          GNMA_6_0_spread: d.GNMA_6_0_vs_UMBS_6_0_spread ?? null,
        });
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        date:        dateStr,
        bonds_count: bonds.length,
        mbs_count:   mbs.length,
        bonds,
        mbs,
      }),
    };

  } catch (err) {
    console.error('getIntradayHistory error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
