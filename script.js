// --- Helper Functions ---
function updateTextElement(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  } else {
    console.warn(`Element with ID '${elementId}' not found.`);
  }
}

function updateChangeIndicator(valueElementId, changeElementId, value, change) {
  updateTextElement(valueElementId, formatValue(value)); // Update the value display

  const changeElement = document.getElementById(changeElementId);
  const parentHeaderItem = changeElement ? changeElement.closest('.header-item') : null; // This might be for the snapshot section only, but kept for consistency

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
  // Check if the value is a number and has decimal places, then format to 3 decimals.
  // Otherwise, return as is or '--' if null/undefined/empty.
  const num = parseFloat(val);
  if (!isNaN(num)) {
    // Check if it's an integer or a float, and apply toFixed only if it's a float
    // or if it's a number that you always want to show with 3 decimal places.
    // Given the examples, 3 decimal places for bond prices/changes seems appropriate.
    return num.toFixed(3);
  }
  return val !== null && val !== undefined && val !== "" ? val : "--";
}

function formatPercentage(val) {
  const formatted = formatValue(val);
  return formatted !== '--' ? `${formatted}%` : '--';
}

// --- Market Data --- (existing from your file)
async function fetchAndUpdateMarketData() {
  console.log("Fetching market data...");
  try {
    const res = await fetch("/.netlify/functions/getTopDashboardData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    if (data?.US10Y) {
      const y = parseFloat(data.US10Y.yield);
      const c = parseFloat(data.US10Y.change);
      updateChangeIndicator('us10yValue', 'us10yChange',
        isNaN(y) ? "--" : y.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3)
      );
    }

    if (data?.US30Y) {
      const y = parseFloat(data.US30Y.yield);
      const c = parseFloat(data.US30Y.change);
      updateChangeIndicator('us30yValue', 'us30yChange',
        isNaN(y) ? "--" : y.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3)
      );
    }

    if (data?.UMBS_5_5) {
      const v = parseFloat(data.UMBS_5_5.current);
      const c = parseFloat(data.UMBS_5_5.change);
      updateChangeIndicator('umbs55Value', 'umbs55Change',
        isNaN(v) ? "--" : v.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3)
      );
    }

    if (data?.GNMA_5_5) {
      const v = parseFloat(data.GNMA_5_5.current);
      const c = parseFloat(data.GNMA_5_5.change);
      updateChangeIndicator('gnma55Value', 'gnma55Change',
        isNaN(v) ? "--" : v.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3)
      );
    }
  } catch (err) {
    console.error("Market data fetch error:", err);
  }
}

// --- Daily Rates --- (existing from your file)
async function fetchAndUpdateDailyRates() {
  console.log("Fetching daily rates...");
  try {
    const res = await fetch("/.netlify/functions/getDailyRatesData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

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

      let changeVs1M = null;
      let changeVs1Y = null;
      const latest = parseFloat(rateData.latest);
      const lastMonth = parseFloat(rateData.last_month);
      const yearAgo = parseFloat(rateData.year_ago);

      if (!isNaN(latest) && !isNaN(lastMonth)) {
        changeVs1M = (latest - lastMonth).toFixed(3);
      }
      if (!isNaN(latest) && !isNaN(yearAgo)) {
        changeVs1Y = (latest - yearAgo).toFixed(3);
      }

      updateTextElement(`${prefix}ChangeVs1M`, changeVs1M !== null ? `${changeVs1M}%` : "--");
      updateTextElement(`${prefix}ChangeVs1Y`, changeVs1Y !== null ? `${changeVs1Y}%` : "--");
    }

    // Top snapshot
    updateTextElement("fixed30yValue", formatPercentage(data?.fixed30Y?.latest));
    updateTextElement("fixed30yYesterday", formatPercentage(data?.fixed30Y?.yesterday));
    updateTextElement("fixed15yValue", formatPercentage(data?.fixed15Y?.latest));
    updateTextElement("fixed15yYesterday", formatPercentage(data?.fixed15Y?.yesterday));

    // Table rows
    updateRateRow("fixed30y", data.fixed30Y);
    updateRateRow("va30y", data.va30Y);
    updateRateRow("fha30y", data.fha30Y);
    updateRateRow("jumbo30y", data.jumbo30Y);
    updateRateRow("usda30y", data.usda30y);
    updateRateRow("fixed15y", data.fixed15Y);
  } catch (err) {
    console.error("Daily Rates fetch error:", err);
  }
}

// --- Live Stocks --- (existing from your file)
async function fetchAndUpdateLiveStockData() {
  console.log("Fetching live stock data...");
  try {
    const res = await fetch("/.netlify/functions/getLiveStockData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    function updateStockChange(id, item) {
      const el = document.getElementById(id);
      if (!el) return;

      el.textContent = '';
      el.classList.remove('positive', 'negative');

      if (item && item.percentChange !== undefined) {
        const n = parseFloat(item.percentChange);
        if (!isNaN(n)) {
          const t = n.toFixed(2);
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

    updateStockChange('spyChange', data.SPY);
    updateStockChange('qqqChange', data.QQQ);
    updateStockChange('diaChange', data.DIA);
  } catch (err) {
    console.error("Stock data fetch error:", err);
  }
}

// --- Economic Indicators --- (existing from your file)
async function fetchAndUpdateEconomicIndicators() {
  console.log("Fetching economic indicators...");
  try {
    const res = await fetch("/.netlify/functions/getEconomicIndicatorsData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    const rows = {
      HOUST: "houst",
      PERMIT1: "permit1",
      HOUST1F: "houst1f",
      RSXFS: "rsxfs",
      UMCSENT: "umcsent",
      CSUSHPINSA: "csushpinsa",
      PERMIT: "permit",
      T10YIE: "t10yie",
      T10Y2Y: "t10y2y"
    };

    Object.entries(rows).forEach(([seriesId, prefix]) => {
      const d = data[seriesId];
      if (!d) return;
      updateTextElement(`${prefix}Latest`, formatValue(d.latest));
      updateTextElement(`${prefix}Date`, formatValue(d.latest_date));
      updateTextElement(`${prefix}LastMonth`, formatValue(d.last_month));
      updateTextElement(`${prefix}YearAgo`, formatValue(d.year_ago));
      // NEW FIELDS:
      updateTextElement(`${prefix}NextRelease`, formatValue(d.next_release));
      updateTextElement(`${prefix}CoveragePeriod`, formatValue(d.coverage_period));
    });
  } catch (err) {
    console.error("Economic Indicators fetch error:", err);
  }
}

// --- NEW: Bonds & Treasuries ---
async function fetchAndUpdateBondData() {
  console.log("Fetching bond and treasury data...");
  try {
    const res = await fetch("/.netlify/functions/getAllBondData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    // Update Last Updated Timestamp
    if (data.last_updated) {
      // Convert "YYYY-MM-DD HH:MM:SS" to a Date object.
      // Assuming the timestamp from Firebase is in UTC, add 'Z' for correct parsing.
      const timestamp = new Date(data.last_updated.replace(' ', 'T') + 'Z');

      // Format to user's local time (e.g., "07/07/2025, 07:20:03 AM GMT-7")
      const formattedTimestamp = timestamp.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true, // Use 12-hour clock with AM/PM
        timeZoneName: 'short' // Include timezone abbreviation
      });
      updateTextElement('bondLastUpdated', `Last Updated: ${formattedTimestamp}`);
    } else {
      updateTextElement('bondLastUpdated', `Last Updated: --`);
    }

    const bondInstruments = [
      "UMBS_5_5", "UMBS_6_0", "GNMA_5_5", "GNMA_6_0",
      "UMBS_5_5_Shadow", "UMBS_6_0_Shadow", "GNMA_5_5_Shadow", "GNMA_6_0_Shadow"
    ];

    bondInstruments.forEach(instrumentKey => {
      const instrumentData = data[instrumentKey];
      if (instrumentData) {
        // Convert instrumentKey like "UMBS_5_5_Shadow" to "umbs55shadow" for HTML IDs
        const prefix = instrumentKey.toLowerCase().replace(/_/g, '');

        // Use updateChangeIndicator for current and change values to get styling
        updateChangeIndicator(`${prefix}Current`, `${prefix}Change`,
                              instrumentData.current, instrumentData.change);

        // Update other fields using updateTextElement
        updateTextElement(`${prefix}Open`, formatValue(instrumentData.open));
        updateTextElement(`${prefix}High`, formatValue(instrumentData.high));
        updateTextElement(`${prefix}Low`, formatValue(instrumentData.low));
        updateTextElement(`${prefix}PrevClose`, formatValue(instrumentData.prevClose));
        // The HTML table has a column for 'Updated', but your current JSON doesn't have an individual updated timestamp per bond.
        // If you need this, you'll have to add it to your Firebase data and the Netlify function.
        // For now, it will remain '--' unless you reuse the global last_updated here, but that might be misleading.
        // updateTextElement(`${prefix}Updated`, data.last_updated ? formatTime(data.last_updated) : '--'); // Example if you want global timestamp here
      } else {
        console.warn(`Data for ${instrumentKey} not found in bond data.`);
        // Set all related fields to '--' if data is missing for an instrument
        const prefix = instrumentKey.toLowerCase().replace(/_/g, '');
        updateTextElement(`${prefix}Current`, '--');
        updateTextElement(`${prefix}Change`, '--');
        updateTextElement(`${prefix}Open`, '--');
        updateTextElement(`${prefix}High`, '--');
        updateTextElement(`${prefix}Low`, '--');
        updateTextElement(`${prefix}PrevClose`, '--');
        // updateTextElement(`${prefix}Updated`, '--');
      }
    });

  } catch (err) {
    console.error("Bond data fetch error:", err);
    updateTextElement('bondLastUpdated', `Last Updated: Error`);
    // Optionally clear or set '--' for all table values on error
    const bondInstruments = [
        "UMBS_5_5", "UMBS_6_0", "GNMA_5_5", "GNMA_6_0",
        "UMBS_5_5_Shadow", "UMBS_6_0_Shadow", "GNMA_5_5_Shadow", "GNMA_6_0_Shadow"
    ];
    bondInstruments.forEach(instrumentKey => {
        const prefix = instrumentKey.toLowerCase().replace(/_/g, '');
        updateTextElement(`${prefix}Current`, '--');
        updateTextElement(`${prefix}Change`, '--');
        updateTextElement(`${prefix}Open`, '--');
        updateTextElement(`${prefix}High`, '--');
        updateTextElement(`${prefix}Low`, '--');
        updateTextElement(`${prefix}PrevClose`, '--');
        // updateTextElement(`${prefix}Updated`, '--');
    });
  }
}

// --- Initialize & Refresh ---
document.addEventListener("DOMContentLoaded", () => {
  // Initial fetches when the page loads
  fetchAndUpdateMarketData();
  fetchAndUpdateDailyRates();
  fetchAndUpdateLiveStockData();
  fetchAndUpdateEconomicIndicators();
  fetchAndUpdateBondData(); // Initial call for bonds & treasuries data

  // Set up refresh intervals
  setInterval(fetchAndUpdateMarketData, 60000); // Every 60 seconds
  setInterval(fetchAndUpdateLiveStockData, 30000); // Every 30 seconds
  setInterval(fetchAndUpdateBondData, 60000); // Refresh bonds & treasuries every 60 seconds
});
