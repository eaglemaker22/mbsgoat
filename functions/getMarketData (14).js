const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Firebase Admin once
function getDb() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

// Today's date in YYYY-MM-DD (Arizona local time, MST = UTC-7)
function todayAZ() {
  const now = new Date();
  const az = new Date(now.getTime() - 7 * 60 * 60 * 1000);
  return az.toISOString().slice(0, 10);
}

exports.handler = async function (event, context) {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const db = getDb();

    // Fetch all docs in parallel
    const docPaths = [
      "market_data/shadow_bonds",
      "market_data/treasury_futures",
      "market_data/mbs_products",
      "market_data/broker_rates",
      "market_data/fred_cache",
      `daily_anchors/${todayAZ()}`,
    ];

    const snapshots = await Promise.all(
      docPaths.map((path) => db.doc(path).get())
    );

    const [
      shadowBonds,
      treasuryFutures,
      mbsProducts,
      brokerRates,
      fredCache,
      dailyAnchor,
    ] = snapshots.map((snap) => (snap.exists ? snap.data() : null));

    // Build staleness flags — scraper writes Arizona local time timestamps
    const now = Date.now();
    function staleMs(tsField) {
      if (!tsField) return null;
      const ts =
        tsField._seconds
          ? tsField._seconds * 1000
          : typeof tsField === "string"
          ? new Date(tsField).getTime()
          : null;
      return ts ? now - ts : null;
    }

    const STALE_WARN_MS = 5 * 60 * 1000; // 5 min
    const STALE_ERROR_MS = 15 * 60 * 1000; // 15 min

    function stalenessStatus(tsField) {
      const age = staleMs(tsField);
      if (age === null) return "unknown";
      if (age < STALE_WARN_MS) return "fresh";
      if (age < STALE_ERROR_MS) return "warn";
      return "stale";
    }

    const payload = {
      fetchedAt: new Date().toISOString(),
      date: todayAZ(),

      // ── Shadow Bonds (ZN, 10Y, 30Y, MBB, predicted UMBS delta) ──
      shadowBonds: shadowBonds
        ? {
            zn_price: shadowBonds.zn_price ?? null,
            zn_delta: shadowBonds.zn_delta ?? null,
            us10y: shadowBonds.us10y ?? shadowBonds.us10y_yield ?? null,
            us10y_delta: shadowBonds.us10y_delta ?? null,
            us30y: shadowBonds.us30y ?? shadowBonds.us30y_yield ?? null,
            us30y_delta: shadowBonds.us30y_delta ?? null,
            mbb: shadowBonds.mbb ?? null,
            mbb_delta: shadowBonds.mbb_delta ?? null,
            predicted_umbs55_delta:
              shadowBonds.predicted_umbs55_delta ??
              shadowBonds.regression_predicted_umbs55_delta ??
              null,
            timestamp: shadowBonds.timestamp ?? shadowBonds.updated_at ?? null,
            status: stalenessStatus(
              shadowBonds.timestamp ?? shadowBonds.updated_at
            ),
          }
        : null,

      // ── Treasury Futures (ZN raw — may be separate doc or in shadow_bonds) ──
      treasuryFutures: treasuryFutures
        ? {
            zn_price: treasuryFutures.zn_price ?? null,
            zn_delta: treasuryFutures.zn_delta ?? null,
            timestamp: treasuryFutures.timestamp ?? null,
            status: stalenessStatus(treasuryFutures.timestamp),
          }
        : null,

      // ── MBS Products (UMBS + GNMA coupons) ──
      mbsProducts: mbsProducts
        ? {
            umbs50: mbsProducts.umbs50 ?? mbsProducts["UMBS 5.0"] ?? null,
            umbs55: mbsProducts.umbs55 ?? mbsProducts["UMBS 5.5"] ?? null,
            umbs60: mbsProducts.umbs60 ?? mbsProducts["UMBS 6.0"] ?? null,
            gnma50: mbsProducts.gnma50 ?? mbsProducts["GNMA 5.0"] ?? null,
            gnma55: mbsProducts.gnma55 ?? mbsProducts["GNMA 5.5"] ?? null,
            gnma60: mbsProducts.gnma60 ?? mbsProducts["GNMA 6.0"] ?? null,
            umbs50_delta: mbsProducts.umbs50_delta ?? null,
            umbs55_delta: mbsProducts.umbs55_delta ?? null,
            umbs60_delta: mbsProducts.umbs60_delta ?? null,
            gnma50_delta: mbsProducts.gnma50_delta ?? null,
            gnma55_delta: mbsProducts.gnma55_delta ?? null,
            gnma60_delta: mbsProducts.gnma60_delta ?? null,
            timestamp: mbsProducts.timestamp ?? mbsProducts.updated_at ?? null,
            status: stalenessStatus(
              mbsProducts.timestamp ?? mbsProducts.updated_at
            ),
          }
        : null,

      // ── Broker Rates (pipeline output — averaged LO rates) ──
      brokerRates: brokerRates
        ? {
            conv30: brokerRates.conv30 ?? null,
            conv15: brokerRates.conv15 ?? null,
            fha30: brokerRates.fha30 ?? null,
            va30: brokerRates.va30 ?? null,
            jumbo30: brokerRates.jumbo30 ?? null,
            cashout30: brokerRates.cashout30 ?? null,
            inv30: brokerRates.inv30 ?? null,
            as_of: brokerRates.as_of ?? null,
            status: stalenessStatus(brokerRates.as_of),
          }
        : null,

      // ── FRED Cache (OBMMI + PMMS series) ──
      fredCache: fredCache
        ? {
            // OBMMI
            obmmic30yf:
              fredCache.obmmic30yf ?? fredCache.OBMMIC30YF ?? null,
            obmmic15yf:
              fredCache.obmmic15yf ?? fredCache.OBMMIC15YF ?? null,
            obmmifha30yf:
              fredCache.obmmifha30yf ?? fredCache.OBMMIFHA30YF ?? null,
            obmmiva30yf:
              fredCache.obmmiva30yf ?? fredCache.OBMMIVA30YF ?? null,
            obmmijumbo30yf:
              fredCache.obmmijumbo30yf ?? fredCache.OBMMIJUMBO30YF ?? null,
            // PMMS
            mortgage30us:
              fredCache.mortgage30us ?? fredCache.MORTGAGE30US ?? null,
            mortgage15us:
              fredCache.mortgage15us ?? fredCache.MORTGAGE15US ?? null,
            // Metadata
            as_of: fredCache.as_of ?? fredCache.fetched_at ?? null,
            status: stalenessStatus(fredCache.as_of ?? fredCache.fetched_at),
          }
        : null,

      // ── Daily Anchor (opening prices, AM brief, etc.) ──
      dailyAnchor: dailyAnchor
        ? {
            open_umbs55: dailyAnchor.open_umbs55 ?? null,
            open_zn: dailyAnchor.open_zn ?? null,
            open_10y: dailyAnchor.open_10y ?? null,
            am_brief: dailyAnchor.am_brief ?? null,
            lock_signal: dailyAnchor.lock_signal ?? null,
            created_at: dailyAnchor.created_at ?? null,
          }
        : null,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify(payload),
    };
  } catch (err) {
    console.error("getMarketData error:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
