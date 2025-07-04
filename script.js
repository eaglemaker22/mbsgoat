// --- Helper Functions to Update DOM Elements ---
function updateTextElement(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  } else {
    console.warn(`Element with ID '${elementId}' not found.`);
  }
}

function updateChangeIndicator(valueElementId, changeElementId, value, change) {
  updateTextElement(valueElementId, formatValue(value));

  const changeElement = document.getElementById(changeElementId);
  const parentHeaderItem = changeElement ? changeElement.closest('.header-item') : null;

  if (changeElement) {
    let formattedChange = formatValue(change);
    changeElement.classList.remove('positive', 'negative');
    if (parentHeaderItem) {
      parentHeaderItem.classList.remove('positive-bg', 'negative-bg', 'neutral-bg');
    }

    let isPositive = false;
    let isNegative = false;

    const numericChange = parseFloat(change);
    if (!isNaN(numericChange)) {
      if (numericChange > 0) {
        formattedChange = `+${numericChange}`;
        isPositive = true;
      } else if (numericChange < 0) {
        formattedChange = `${numericChange}`;
        isNegative = true;
      }
    }

    if (isPositive) {
      changeElement.classList.add('positive');
      if (parentHeaderItem) parentHeaderItem.classList.add('positive-bg');
    } else if (isNegative) {
      changeElement.classList.add('negative');
      if (parentHeaderItem) parentHeaderItem.classList.add('negative-bg');
    } else {
      if (parentHeaderItem) parentHeaderItem.classList.add('neutral-bg');
    }

    changeElement.textContent = formattedChange;
  }
}

function formatValue(val) {
  return val !== null && val !== undefined && val !== "" ? val : "--";
}

function formatPercentage(val) {
  const formatted = formatValue(val);
  return formatted !== '--' ? `${formatted}%` : '--';
}

// --- Function for Market Data ---
async function fetchAndUpdateMarketData() {
  console.log("Fetching market data...");
  try {
    const resTop = await fetch("/.netlify/functions/getTopDashboardData");
    if (!resTop.ok) throw new Error(`HTTP error! status: ${resTop.status}`);
    const dataTop = await resTop.json();

    if (dataTop?.US10Y) {
      const y = parseFloat(dataTop.US10Y.yield);
      const c = parseFloat(dataTop.US10Y.change);
      updateChangeIndicator('us10yValue', 'us10yChange',
        isNaN(y) ? "--" : y.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3)
      );
    }
    
    if (dataTop?.US30Y) {
      const y30 = parseFloat(dataTop.US30Y.yield);
      const c30 = parseFloat(dataTop.US30Y.change);
      updateChangeIndicator('us30yValue', 'us30yChange',
        isNaN(y30) ? "--" : y30.toFixed(3),
        isNaN(c30) ? "--" : c30.toFixed(3)
      );
    }

    if (dataTop?.UMBS_5_5) {
      const v = parseFloat(dataTop.UMBS_5_5.current);
      const c = parseFloat(dataTop.UMBS_5_5.change);
      updateChangeIndicator('umbs55Value', 'umbs55Change',
        isNaN(v) ? "--" : v.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3)
      );
    }

    if (dataTop?.GNMA_5_5) {
      const v = parseFloat(dataTop.GNMA_5_5.current);
      const c = parseFloat(dataTop.GNMA_5_5.change);
      updateChangeIndicator('gnma55Value', 'gnma55Change',
        isNaN(v) ? "--" : v.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3)
      );
    }

  } catch (err) {
    console.error("Market data fetch error:", err);
  }
}

// --- Function for Daily Rates ---
async function fetchAndUpdateDailyRates() {
  console.log("Fetching daily rates data...");
  try {
    const resRates = await fetch("/.netlify/functions/getDailyRatesData");
    if (!resRates.ok) throw new Error(`HTTP error! status: ${resRates.status}`);
    const data = await resRates.json();

    function updateRateRow(prefix, rateData) {
      if (!rateData) return;

      updateTextElement(`${prefix}Current`, formatPercentage(rateData.latest));

      if (prefix === "fixed30y") {
        updateTextElement("fixed30yYesterdayTable", formatPercentage(rateData.yesterday));
      } else if (prefix === "fixed15y") {
        updateTextElement("fixed15yYesterdayTable", formatPercentage(rateData.yesterday));
      } else {
        updateTextElement(`${prefix}Yesterday`, formatPercentage(rateData.yesterday));
      }

      updateTextElement(`${prefix}LastMonth`, formatPercentage(rateData.last_month));
      updateTextElement(`${prefix}YearAgo`, formatPercentage(rateData.year_ago));
    }

    updateTextElement("fixed30yValue", formatPercentage(data?.fixed30Y?.latest));
    updateTextElement("fixed30yYesterday", formatPercentage(data?.fixed30Y?.yesterday));
    updateTextElement("fixed15yValue", formatPercentage(data?.fixed15Y?.latest));
    updateTextElement("fixed15yYesterday", formatPercentage(data?.fixed15Y?.yesterday));

    updateRateRow("fixed30y", data.fixed30Y);
    updateRateRow("va30y", data.va30Y);
    updateRateRow("fha30y", data.fha30Y);
    updateRateRow("jumbo30y", data.jumbo30Y);
    updateRateRow("usda30y", data.usda30Y);
    updateRateRow("fixed15y", data.fixed15Y);

  } catch (err) {
    console.error("Daily Rates fetch error:", err);
  }
}

// --- Function for Live Stocks ---
async function fetchAndUpdateLiveStockData() {
  console.log("Fetching live stock data...");
  try {
    const res = await fetch("/.netlify/functions/getLiveStockData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const stockData = await res.json();

    function updateStockChange(id, data) {
      const el = document.getElementById(id);
      if (!el) return;

      el.textContent = '';
      el.classList.remove('positive', 'negative');

      if (data && data.percentChange !== undefined) {
        const n = parseFloat(data.percentChange);
        if (!isNaN(n)) {
          let t = n.toFixed(2);
          if (n > 0) {
            el.textContent = `+${t}%`;
            el.classList.add('positive');
          } else if (n < 0) {
            el.textContent = `${t}%`;
            el.classList.add('negative');
          } else {
            el.textContent = '0.00%';
          }
        }
      } else {
        el.textContent = '--';
      }
    }

    updateStockChange('spyChange', stockData.SPY);
    updateStockChange('qqqChange', stockData.QQQ);
    updateStockChange('diaChange', stockData.DIA);

  } catch (err) {
    console.error("Stock data fetch error:", err);
  }
}

// --- Function for Economic Indicators ---
async function fetchAndUpdateEconomicIndicators() {
  console.log("Fetching economic indicators...");
  try {
    const res = await fetch("/.netlify/functions/getEconomicIndicatorsData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    console.log("✅ Economic Indicators Response:", data);

    function format(val) {
      return val !== undefined && val !== null && val !== "" ? val : "--";
    }

    const mapping = {
      "HOUST": "housingStarts",
      "PERMIT1": "permits",
      "HOUST1F": "singleFamilyStarts",
      "RSAFS": "retailSales",
      "UMCSENT": "consumerSentiment",
      "CSUSHPISA": "caseShiller",
      "PERMIT": "buildingPermits",
      "T10YIE": "breakevenInflation",
      "T10Y2Y": "tenTwoSpread"
    };

    for (const [seriesId, prefix] of Object.entries(mapping)) {
      const record = data[seriesId];
      if (!record) continue;

      updateTextElement(`${prefix}Latest`, format(record.latest));
      updateTextElement(`${prefix}LastMonth`, format(record.last_month));
      updateTextElement(`${prefix}YearAgo`, format(record.year_ago));
      updateTextElement(`${prefix}Change`, record.monthly_change !== null ? `${record.monthly_change}` : "--");
    }
  } catch (err) {
    console.error("Economic indicators fetch error:", err);
  }
}

// --- Initialize & Refresh ---
document.addEventListener("DOMContentLoaded", () => {
  fetchAndUpdateMarketData();
  fetchAndUpdateDailyRates();
  fetchAndUpdateLiveStockData();
  fetchAndUpdateEconomicIndicators();

  setInterval(fetchAndUpdateMarketData, 60000);
  setInterval(fetchAndUpdateLiveStockData, 30000);
});
