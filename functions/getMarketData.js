const admin = require('firebase-admin');
const https = require('https');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

/* FRED in-memory cache — refreshes once per hour max */
let fredCache = { data: null, fetchedAt: 0 };
const FRED_TTL_MS = 60 * 60 * 1000;

/* FRED fetch helper */
const FRED_SERIES = [
  { id: 'OBMMIC30YF',     product: '30Y CONV'  },
  { id: 'OBMMIFHA30YF',   product: '30Y FHA'   },
  { id: 'OBMMIVA30YF',    product: '30Y VA'    },
  { id: 'OBMMIJUMBO30YF', product: '30Y JUMBO' },
  { id: 'OBMMIC15YF',     product: '15Y CONV'  },
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

async function fetchMCRRates(apiKey) {
  const now = Date.now();
  if (fredCache.data && (now - fredCache.fetchedAt) < FRED_TTL_MS) {
    return fredCache.data;
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
        ? Math.round((rate - prevRate) * 1000) / 1000 : 0;
      if (latest && !asOf) asOf = latest.date;
      return { product, rate, change };
    }).filter(r => r.rate !== null);
    fredCache = { data: { rates, as_of: asOf }, fetchedAt: now };
    return fredCache.data;
  } catch(err) {
    console.error('FRED fetch error:', err.message);
    return fredCache.data || null;
  }
}

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    /* fetch Firestore + FRED in parallel */
    const [mbsSnap, bondsSnap, bpiSnap, mcrData] = await Promise.all([
      db.collection('market_data').doc('mbs_products').get(),
      db.collection('market_data').doc('shadow_bonds').get(),
      db.collection('market_data').doc('broker_rates').get(),
      fetchMCRRates(process.env.FRED_API_KEY),
    ]);

    if (!mbsSnap.exists || !bondsSnap.exists) {
      return { statusCode: 503, headers, body: JSON.stringify({ error: 'Firestore documents not found' }) };
    }

    const mbs   = mbsSnap.data();
    const bonds = bondsSnap.data();
    const bpi   = bpiSnap.exists ? bpiSnap.data() : null;

    /* helpers */
    const f = (val) => parseFloat(val) || 0;
    const priceTicks = (cur, opn) => Math.round((f(cur) - f(opn)) * 32 * 10) / 10;
    const bpsDelta   = (cur, opn) => Math.round((f(cur) - f(opn)) * 100 * 10) / 10;

    /* UMBS 5.0 */
    const umbs50_current = f(mbs.UMBS_5_0_Current);
    const umbs50_open    = f(mbs.UMBS_5_0_Open);
    const umbs50_hi      = f(mbs.UMBS_5_0_TodayHigh);
    const umbs50_lo      = f(mbs.UMBS_5_0_TodayLow);
    const umbs50_delta   = priceTicks(umbs50_current, umbs50_open);

    /* 10Y yield */
    const t10y_current = f(bonds.US10Y_Current);
    const t10y_open    = f(bonds.US10Y_Open);
    const t10y_delta   = bpsDelta(t10y_current, t10y_open);

    /* ZN1! futures */
    const zn_current    = f(bonds.ZN1_Current);
    const zn_open       = f(bonds.ZN1_Open);
    const zn_hi         = f(bonds.ZN1_TodayHigh);
    const zn_lo         = f(bonds.ZN1_TodayLow);
    const zn_deltaTicks = f(bonds.delta_ZN_ticks);

    /* $/100k estimate */
    const est_per100k = Math.round(-(umbs50_delta / 10) * 0.25 * 1000);

    function bondFmt(decPrice) {
      const whole = Math.floor(decPrice);
      const ticks = Math.round((decPrice - whole) * 32);
      return `${whole}-${String(ticks).padStart(2, '0')}`;
    }

    /* BPI rates from Firestore */
    const bpiRates = bpi ? [
      { product: '30Y CONV',    rate: f(bpi.conv30),    tag: null },
      { product: '30Y FHA',     rate: f(bpi.fha30),     tag: null },
      { product: '30Y VA',      rate: f(bpi.va30),       tag: null },
      { product: '30Y JUMBO',   rate: f(bpi.jumbo30),   tag: null },
      { product: '15Y CONV',    rate: f(bpi.conv15),    tag: null },
      { product: '30Y CASHOUT', rate: f(bpi.cashout30), tag: 'CASHOUT' },
      { product: '30Y INVEST',  rate: f(bpi.inv30),     tag: 'INVEST'  },
    ] : null;

    const payload = {
      last_updated: bonds.last_updated || mbs.last_updated,
      trading_day:  bonds.trading_day_date,

      umbs50: {
        current:    umbs50_current,
        open:       umbs50_open,
        openFmt:    bondFmt(umbs50_open),
        currentFmt: bondFmt(umbs50_current),
        delta:      umbs50_delta,
        hiTicks:    priceTicks(umbs50_hi, umbs50_open),
        loTicks:    priceTicks(umbs50_lo, umbs50_open),
      },

      t10y: {
        current: t10y_current,
        open:    t10y_open,
        openFmt: t10y_open.toFixed(3) + '%',
        delta:   t10y_delta,
        hiTicks: null,
        loTicks: null,
      },

      zn: {
        current:    zn_current,
        open:       zn_open,
        openFmt:    bondFmt(zn_open),
        currentFmt: bondFmt(zn_current),
        raw:        bonds.ZN1_Raw,
        delta:      zn_deltaTicks,
        hiTicks:    priceTicks(zn_hi, zn_open),
        loTicks:    priceTicks(zn_lo, zn_open),
      },

      est_per100k,

      bpi: {
        rates:        bpiRates,
        as_of:        bpi ? bpi.as_of : null,
        last_updated: bpi ? bpi.last_updated : null,
      },

      mcr: mcrData ? {
        rates:  mcrData.rates,
        as_of:  mcrData.as_of,
        source: 'FRED/OBMMI',
      } : null,

      regression: {
        predicted_umbs55_delta: f(bonds.predicted_UMBS55_delta_ticks),
        model_version:          bonds.regression_model_version,
        delta_10y:              f(bonds.delta_10Y),
        delta_zn_ticks:         f(bonds.delta_ZN_ticks),
        delta_mbb:              f(bonds.delta_MBB),
      },

      scraper_status: {
        mbs_scraper:   mbs.scraper_name,
        bonds_scraper: bonds.scraper_name,
        mbs_updated:   mbs.last_updated,
        bonds_updated: bonds.last_updated,
      },
    };

    return { statusCode: 200, headers, body: JSON.stringify(payload) };

  } catch (err) {
    console.error('getMarketData error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
