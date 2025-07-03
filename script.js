document.addEventListener("DOMContentLoaded", () => {
  fetchAndUpdateMarketSnapshot();
  setInterval(fetchAndUpdateMarketSnapshot, 300000); // Refresh every 5 min
});

async function fetchAndUpdateMarketSnapshot() {
  console.log("Fetching market snapshot data...");

  try {
    // 1) Get MBS and Treasuries
    const resTop = await fetch("/.netlify/functions/getTopDashboardData");
    if (!resTop.ok) throw new Error(`TopDashboardData error ${resTop.status}`);
    const dataTop = await resTop.json();

    // 2) Get Mortgage Rates
    const resRates = await fetch("/.netlify/functions/getDailyRatesData");
    if (!resRates.ok) throw new Error(`DailyRatesData error ${resRates.status}`);
    const dataRates = await resRates.json();

    // 3) Get Equities
    const resStocks = await fetch("/.netlify/functions/getLiveStockData");
    if (!resStocks.ok) throw new Error(`LiveStockData error ${resStocks.status}`);
    const dataStocks = await resStocks.json();

    // --- MBS ---
    updateCell("umbs55Value", formatValue(dataTop?.UMBS_5_5?.current));
    updateChange("umbs55Change", dataTop?.UMBS_5_5?.change);

    updateCell("gnma55Value", formatValue(dataTop?.GNMA_5_5?.current));
    updateChange("gnma55Change", dataTop?.GNMA_5_5?.change);

    // --- Treasuries ---
    updateCell("us10yValue", formatValue(dataTop?.US10Y?.yield));
    updateChange("us10yChange", dataTop?.US10Y?.change);

    updateCell("us30yValue", formatValue(dataTop?.US30Y?.yield));
    updateChange("us30yChange", dataTop?.US30Y?.change);

    // --- Mortgage Rates ---
    updateCell("fixed30yValue", formatPercentage(dataRates?.fixed30Y?.latest));
    updateCell("fixed15yValue", formatPercentage(dataRates?.fixed15Y?.latest));

    // --- Equities ---
    updateEquity("diaChange", dataStocks?.DIA?.percentChange);
    updateEquity("spyChange", dataStocks?.SPY?.percentChange);
    updateEquity("qqqChange", dataStocks?.QQQ?.percentChange);

    // --- Timestamp ---
    const tsEl = document.getElementById("lastUpdated");
    if (tsEl) {
      tsEl.textContent = "Last updated: " + new Date().toLocaleString();
    }

  } catch (err) {
    console.error("Market Snapshot Fetch Error:", err);
  }
}

// --- Helper: Update numeric cells ---
function updateCell(id, val) {
  const el = document.getElementById(id);
  el.textContent = val !== undefined && val !== null ? val : "--";
}

// --- Helper: Update change cells with +/- sign and color ---
function updateChange(id, val) {
  const el = document.getElementById(id);
  el.classList.remove("positive", "negative");

  if (val === undefined || val === null) {
    el.textContent = "--";
    return;
  }

  const num = parseFloat(val);
  if (isNaN(num)) {
    el.textContent = val; // fallback for string
  } else {
    el.textContent = `${num > 0 ? "+" : ""}${num.toFixed(3)}`;
    el.classList.add(num > 0 ? "positive" : "negative");
  }
}

// --- Helper: Format percentage ---
function formatPercentage(val) {
  if (val === undefined || val === null) return "--";
  const num = parseFloat(val);
  return isNaN(num) ? "--" : `${num.toFixed(3)}%`;
}

// --- Helper: Format plain value (e.g., price or yield) ---
function formatValue(val) {
  if (val === undefined || val === null) return "--";
  const num = parseFloat(val);
  return isNaN(num) ? val : num.toFixed(3);
}

// --- Helper: Update Equities ---
function updateEquity(id, val) {
  const el = document.getElementById(id);
  el.classList.remove("positive", "negative");

  if (val === undefined || val === null) {
    el.textContent = "--";
    return;
  }

  const num = parseFloat(val);
  if (isNaN(num)) {
    el.textContent = val;
  } else {
    el.textContent = `${num > 0 ? "+" : ""}${num.toFixed(2)}%`;
    el.classList.add(num > 0 ? "positive" : "negative");
  }
}
