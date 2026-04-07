// functions/getMarketData.js
// Reads Firestore first for shadow bonds + yields, Finnhub for equities, FRED for rates
// Zero npm dependencies except firebase-admin (handled via Netlify environment)

const https = require('https');

const FINNHUB_KEY  = process.env.FINNHUB_API_KEY;
const FRED_KEY     = process.env.FRED_API_KEY;
const FB_PROJECT   = process.env.FIREBASE_PROJECT_ID;
const FB_EMAIL     = process.env.FIREBASE_CLIENT_EMAIL;
const FB_KEY       = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : null;

// Finnhub symbols — trimmed to what we display
const FINNHUB_SYMBOLS = ['SPY','QQQ','DIA','MBB','TLT','VMBS','BINANCE:BTCUSDT','UUP'];

// FRED series
const FRED_SERIES = [
  'OBMMIC30YF','OBMMIFHA30YF','OBMMIVA30YF','OBMMIJUMBO30YF','OBMMIC15YF',
  'MORTGAGE30US',       // Freddie Mac PMMS 30Y weekly
  'WRMORTNS',           // MBA weekly mortgage rate
  'DGS1MO','DGS3MO','DGS6MO','DGS1','DGS2','DGS5','DGS10','DGS20','DGS30',
  'T10Y2Y',             // 10Y-2Y spread
  'T10YIE',             // Breakeven inflation
  'FEDFUNDS',           // Fed funds rate
  'VIXCLS',             // VIX (end of day)
  'HOUST','UMCSENT','PERMIT',
];

// FOMC meeting dates — update quarterly
const FOMC_DATES = [
  '2026-04-30','2026-06-17','2026-07-29','2026-09-16',
  '2026-11-04','2026-12-16',
];

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

async function batchAll(items, fn, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    const r = await Promise.all(items.slice(i, i + size).map(fn));
    out.push(...r);
    if (i + size < items.length) await new Promise(r => setTimeout(r, 250));
  }
  return out;
}

async function fetchFinnhub(symbol) {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`;
    const res = await get(url);
    if (res.status !== 200) return { symbol, error: `HTTP ${res.status}` };
    const q = JSON.parse(res.body);
    if (!q || !q.c || q.c === 0) return { symbol, error: 'No data' };
    const current = parseFloat(q.c);
    const prev = parseFloat(q.pc);
    const change = current - prev;
    const pct = prev !== 0 ? (change / prev) * 100 : 0;
    return {
      symbol, current: +current.toFixed(2), prev: +prev.toFixed(2),
      change: +change.toFixed(3), pct: +pct.toFixed(3),
      high: q.h || null, low: q.l || null, open: q.o || null, timestamp: q.t || null,
    };
  } catch(e) { return { symbol, error: e.message }; }
}

async function fetchFredSeries(seriesId) {
  if (!FRED_KEY) return { seriesId, error: 'No FRED key' };
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_KEY}&limit=7&sort_order=desc&file_type=json`;
    const res = await get(url);
    if (res.status !== 200) return { seriesId, error: `HTTP ${res.status}` };
    const d = JSON.parse(res.body);
    if (d.error_message) return { seriesId, error: d.error_message };
    const obs = (d.observations || []).filter(o => o.value !== '.');
    if (!obs.length) return { seriesId, error: 'No observations' };
    // Return last 5 valid for trend calculation
    const vals = obs.slice(0, 5).map(o => ({ date: o.date, value: parseFloat(o.value) }));
    // Trend: compare latest vs 5-period ago
    let trend = 'flat';
    if (vals.length >= 3) {
      const diff = vals[0].value - vals[Math.min(4, vals.length-1)].value;
      if (diff > 0.02) trend = 'up';
      else if (diff < -0.02) trend = 'down';
    }
    return {
      seriesId,
      latest: vals[0].value, latestDate: vals[0].date,
      prev: vals[1]?.value || null, prevDate: vals[1]?.date || null,
      change: vals[1] ? +((vals[0].value - vals[1].value).toFixed(4)) : null,
      trend, // 'up' | 'down' | 'flat'
      history: vals,
    };
  } catch(e) { return { seriesId, error: e.message }; }
}

// Firestore REST API — no SDK needed
async function fetchFirestore(collection, doc) {
  if (!FB_PROJECT || !FB_EMAIL || !FB_KEY) return null;
  try {
    // Get access token via service account JWT
    const jwt = await getFirebaseToken();
    if (!jwt) return null;
    const url = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents/${collection}/${doc}`;
    const req = https.request(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' }
    });
    return new Promise((resolve) => {
      req.setTimeout(6000, () => { req.destroy(); resolve(null); });
      req.on('error', () => resolve(null));
      req.on('response', (res) => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.fields) resolve(flattenFirestore(parsed.fields));
            else resolve(null);
          } catch { resolve(null); }
        });
      });
      req.end();
    });
  } catch { return null; }
}

function flattenFirestore(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) out[k] = v.stringValue;
    else if (v.doubleValue !== undefined) out[k] = v.doubleValue;
    else if (v.integerValue !== undefined) out[k] = parseInt(v.integerValue);
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
    else if (v.timestampValue !== undefined) out[k] = v.timestampValue;
    else if (v.nullValue !== undefined) out[k] = null;
  }
  return out;
}

async function getFirebaseToken() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: FB_EMAIL, sub: FB_EMAIL,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now, exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/datastore',
    })).toString('base64url');

    const crypto = require('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const sig = sign.sign(FB_KEY, 'base64url');
    const jwt = `${header}.${payload}.${sig}`;

    const tokenRes = await new Promise((resolve, reject) => {
      const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
      const req = https.request('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
      });
      req.setTimeout(6000, () => { req.destroy(); reject(new Error('token timeout')); });
      req.on('error', reject);
      req.on('response', (res) => {
        let d = '';
        res.on('data', c => { d += c; });
        res.on('end', () => resolve(JSON.parse(d)));
      });
      req.write(body); req.end();
    });
    return tokenRes.access_token || null;
  } catch { return null; }
}

function nextFomc() {
  const today = new Date();
  today.setHours(0,0,0,0);
  for (const d of FOMC_DATES) {
    const dt = new Date(d + 'T00:00:00');
    if (dt >= today) {
      const days = Math.ceil((dt - today) / 86400000);
      return { date: d, daysAway: days };
    }
  }
  return null;
}

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    // Run all fetches in parallel
    const [finnhubResults, fredResults, fsShadow, fsUS10Y, fsUS30Y, fsMBS] = await Promise.all([
      Promise.all(FINNHUB_SYMBOLS.map(fetchFinnhub)),
      FRED_KEY ? batchAll(FRED_SERIES, fetchFredSeries, 5) : Promise.resolve([]),
      fetchFirestore('market_data', 'shadow_bonds'),
      fetchFirestore('market_data', 'us10y_current'),
      fetchFirestore('market_data', 'us30y_current'),
      fetchFirestore('market_data', 'mbs_products'),
    ]);

    const equities = {};
    finnhubResults.forEach(r => { equities[r.symbol] = r; });

    const fred = {};
    fredResults.forEach(r => { if (r.seriesId) fred[r.seriesId] = r; });

    // Yield curve from FRED
    const yieldCurve = {
      source: 'FRED H.15', date: fred['DGS10']?.latestDate || null,
      m1: fred['DGS1MO']?.latest||null, m3: fred['DGS3MO']?.latest||null,
      m6: fred['DGS6MO']?.latest||null, y1: fred['DGS1']?.latest||null,
      y2: fred['DGS2']?.latest||null,   y5: fred['DGS5']?.latest||null,
      y10: fred['DGS10']?.latest||null, y20: fred['DGS20']?.latest||null,
      y30: fred['DGS30']?.latest||null,
    };

    // Shadow bonds from Firestore — structured for frontend
    const shadow = fsShadow ? {
      source: 'firestore',
      lastUpdated: fsShadow.last_updated || null,
      UMBS55: {
        current:      parseFloat(fsShadow.UMBS_5_5_Shadow_Current)      || null,
        open:         parseFloat(fsShadow.UMBS_5_5_Shadow_Open)          || null,
        priorClose:   parseFloat(fsShadow.UMBS_5_5_Shadow_PriorDayClose) || null,
        dailyChange:  parseFloat(fsShadow.UMBS_5_5_Shadow_Daily_Change)  || null,
        high:         parseFloat(fsShadow.UMBS_5_5_Shadow_TodayHigh)     || null,
        low:          parseFloat(fsShadow.UMBS_5_5_Shadow_TodayLow)      || null,
        close:        parseFloat(fsShadow.UMBS_5_5_Shadow_Close)         || null,
      },
      UMBS60: {
        current:      parseFloat(fsShadow.UMBS_6_0_Shadow_Current)      || null,
        open:         parseFloat(fsShadow.UMBS_6_0_Shadow_Open)          || null,
        priorClose:   parseFloat(fsShadow.UMBS_6_0_Shadow_PriorDayClose) || null,
        dailyChange:  parseFloat(fsShadow.UMBS_6_0_Shadow_Daily_Change)  || null,
        high:         parseFloat(fsShadow.UMBS_6_0_Shadow_TodayHigh)     || null,
        low:          parseFloat(fsShadow.UMBS_6_0_Shadow_TodayLow)      || null,
      },
      GNMA55: {
        current:      parseFloat(fsShadow.GNMA_5_5_Shadow_Current)      || null,
        priorClose:   parseFloat(fsShadow.GNMA_5_5_Shadow_PriorDayClose) || null,
        dailyChange:  parseFloat(fsShadow.GNMA_5_5_Shadow_Daily_Change)  || null,
      },
    } : { source: 'unavailable' };

    // Raw yields from Firestore scraper (fresher than FRED for intraday)
    const liveYields = {
      source: fsUS10Y ? 'firestore' : 'fred',
      us10y: fsUS10Y ? {
        current:    parseFloat(fsUS10Y.US10Y_Current)      || fred['DGS10']?.latest || null,
        open:       parseFloat(fsUS10Y.US10Y_Open)          || null,
        priorClose: parseFloat(fsUS10Y.US10Y_PriorDayClose) || null,
        dailyChange:parseFloat(fsUS10Y.US10Y_Daily_Change)  || null,
        high:       parseFloat(fsUS10Y.US10Y_TodayHigh)     || null,
        low:        parseFloat(fsUS10Y.US10Y_TodayLow)      || null,
        lastUpdated: fsUS10Y.last_updated || null,
      } : { current: fred['DGS10']?.latest || null, source: 'fred' },
      us30y: fsUS30Y ? {
        current:    parseFloat(fsUS30Y.US30Y_Current)      || fred['DGS30']?.latest || null,
        open:       parseFloat(fsUS30Y.US30Y_Open)          || null,
        priorClose: parseFloat(fsUS30Y.US30Y_PriorDayClose) || null,
        dailyChange:parseFloat(fsUS30Y.US30Y_Daily_Change)  || null,
        high:       parseFloat(fsUS30Y.US30Y_TodayHigh)     || null,
        low:        parseFloat(fsUS30Y.US30Y_TodayLow)      || null,
        lastUpdated: fsUS30Y.last_updated || null,
      } : { current: fred['DGS30']?.latest || null, source: 'fred' },
    };

    // Real MBS prices from MBS Live (when scraper running)
    const realMBS = fsMBS ? {
      source: 'mbs_live',
      lastUpdated: fsMBS.last_updated || null,
      UMBS55: {
        current:    parseFloat(fsMBS.UMBS_5_5_Current)      || null,
        open:       parseFloat(fsMBS.UMBS_5_5_Open)          || null,
        priorClose: parseFloat(fsMBS.UMBS_5_5_PriorDayClose) || null,
        dailyChange:parseFloat(fsMBS.UMBS_5_5_Daily_Change)  || null,
        high:       parseFloat(fsMBS.UMBS_5_5_TodayHigh)     || null,
        low:        parseFloat(fsMBS.UMBS_5_5_TodayLow)      || null,
      },
      UMBS60: {
        current:    parseFloat(fsMBS.UMBS_6_0_Current)      || null,
        priorClose: parseFloat(fsMBS.UMBS_6_0_PriorDayClose) || null,
        dailyChange:parseFloat(fsMBS.UMBS_6_0_Daily_Change)  || null,
      },
    } : null;

    // Synthetic from Firestore shadow (primary) or MBB fallback
    // Uses new regression formula: ΔUMBS5.5 = (-2.387×Δ10Y) + (0.069×ΔZN) + (0.122×ΔMBB)
    let lockiqSignal = null;
    if (shadow.UMBS55?.current && shadow.UMBS55?.priorClose) {
      const deltaPoints = shadow.UMBS55.dailyChange || 0;
      const deltaTicks  = deltaPoints * 32;
      lockiqSignal = {
        source:      'firestore_shadow',
        current:     shadow.UMBS55.current,
        priorClose:  shadow.UMBS55.priorClose,
        open:        shadow.UMBS55.open,
        deltaPoints: +deltaPoints.toFixed(3),
        deltaTicks:  +deltaTicks.toFixed(1),
        high:        shadow.UMBS55.high,
        low:         shadow.UMBS55.low,
        close:       shadow.UMBS55.close,
        lastUpdated: shadow.lastUpdated,
      };
    } else {
      // Fallback: MBB-based synthetic
      const mbb = equities['MBB'];
      if (mbb && !mbb.error) {
        const deltaPoints = mbb.change * 0.4345 * (100/94);
        lockiqSignal = {
          source:      'mbb_fallback',
          deltaPoints: +deltaPoints.toFixed(3),
          deltaTicks:  +(deltaPoints * 32).toFixed(1),
          lastUpdated: null,
        };
      }
    }

    // MBS spread over 10Y
    const obmmi30 = fred['OBMMIC30YF']?.latest;
    const y10     = liveYields.us10y?.current || fred['DGS10']?.latest;
    const mbsSpread = (obmmi30 && y10) ? +((obmmi30 - y10) * 100).toFixed(0) : null;

    // Implied current 30Y conv rate from shadow movement
    let impliedRate = null;
    if (obmmi30 && lockiqSignal?.deltaPoints != null) {
      // 1 point ≈ 0.125% rate change, inverted (price up = rate down)
      impliedRate = +(obmmi30 + (-lockiqSignal.deltaPoints * 0.125)).toFixed(3);
    }

    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        timestamp:   new Date().toISOString(),
        equities,
        fred,
        yieldCurve,
        liveYields,
        shadow,
        realMBS,
        lockiqSignal,
        mbsSpread,
        impliedRate,
        fomc:        nextFomc(),
        fedFunds:    fred['FEDFUNDS']?.latest || null,
        vix:         fred['VIXCLS']?.latest   || null,
        meta: {
          finnhubLoaded:    finnhubResults.filter(r => !r.error).length,
          fredLoaded:       fredResults.filter(r => !r.error).length,
          firestoreLoaded:  !!(fsShadow || fsUS10Y),
          shadowSource:     lockiqSignal?.source || 'none',
        },
      }),
    };
  } catch(e) {
    console.error('getMarketData error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
