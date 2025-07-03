document.addEventListener("DOMContentLoaded", () => {
  fetchAndUpdateMarketSnapshot();
  setInterval(fetchAndUpdateMarketSnapshot, 60000); // refresh every 60 sec
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
    updateMbsCell("umbs55Value", dataTop?.UMBS_5_5?.current);
    updateMbsChange("umbs55Change", dataTop?.UMBS_5_5?.change);

    updateMbsCell("gnma55Value", dataTop?.GNMA_5_5?.current);
    updateMbsChange("gnma55Change", dataTop?.GNMA_5_5?.change);

    // --- Treasuries ---
    updateMbsCell("us10yValue", dataTop?.US10Y?.yield);
    updateMbsChange("us10yChange", dataTop?.US10Y?.change);

    updateMbsCell("us30yValue", dataTop?.US30Y?.yield);
    updateMbsChange("us30yChange", dataTop?.US30Y?.change);

    // --- Mortgage Rates ---
    updateMbsCell("fixed30yValue", formatPercentage(dataRates?.fixed30Y?.latest));
    updateMbsCell("fixed15yValue", formatPercentage(dataRates?.fixed15Y?.latest));

    // --- Equities ---
    updateEquity("diaChange", dataStocks?.DIA?.percentChange);
    updateEquity("spyChange", dataStocks?.SPY?.percentChange);
    updateEquity("qqqChange", dataStocks?.QQQ?.percentChange);

  } catch (err) {
    console.error("Market Snapshot Fetch Error:", err);
  }
}

// --- Helper: Update numeric cells
function updateMbsCell(id, val) {
  const el = document.getElementById(id);
  el.textContent = val !== undefined && val !== null ? val : "--";
}

// --- Helper: Update change cells with +/- sign and color
function updateMbsChange(id, val) {
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
    el.textContent = `${num > 0 ? "+" : ""}${num}`;
    el.classList.add(num > 0 ? "positive" : "negative");
  }
}

// --- Helper: Format percentage
function formatPercentage(val) {
  if (val === undefined || val === null) return "--";
  const num = parseFloat(val);
  return isNaN(num) ? "--" : `${num.toFixed(3)}%`;
}

// --- Helper: Update Equities
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
