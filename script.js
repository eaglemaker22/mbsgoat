// --- Helper Functions (No changes needed here) ---
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
  // parentHeaderItem is specific to the Market Snapshot section's styling
  const parentHeaderItem = changeElement ? changeElement.closest('.header-item') : null;

  if (changeElement) {
    let formattedChange = formatValue(change);
    changeElement.classList.remove('positive', 'negative');
    if (parentHeaderItem) { // Only apply if in the snapshot section
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
  const num = parseFloat(val);
  if (!isNaN(num)) {
    return num.toFixed(3); // Consistent 3 decimal places for numbers
  }
  return val !== null && val !== undefined && val !== "" ? val : "--";
}

function formatPercentage(val) {
  const formatted = formatValue(val);
  return formatted !== '--' ? `${formatted}%` : '--';
}

// --- Market Data --- (Existing, no changes)
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
      // This is for the Snapshot section, not the table, so IDs are different
      updateChangeIndicator('umbs55Value', 'umbs55Change',
        isNaN(v) ? "--" : v.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3)
      );
    }

    if (data?.GNMA_5_5) {
      const v = parseFloat(data.GNMA_5_5.current);
      const c = parseFloat(data.GNMA_5_5.change);
      // This is for the Snapshot section, not the table, so IDs are different
      updateChangeIndicator('gnma55Value', 'gnma55Change',
        isNaN(v) ? "--" : v.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3)
      );
    }
  } catch (err) {
    console.error("Market data fetch error:", err);
  }
}

// --- Daily Rates --- (Existing, no changes)
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

// --- Live Stocks --- (Existing, no changes)
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

// --- Economic Indicators --- (Existing, no changes)
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
      updateTextElement(`${prefix}NextRelease`, formatValue(d.next_release));
      updateTextElement(`${prefix}CoveragePeriod`, formatValue(d.coverage_period));
    });
  } catch (err) {
    console.error("Economic Indicators fetch error:", err);
  }
}

// --- Bonds & Treasuries (UPDATED to use unique HTML IDs) ---
async function fetchAndUpdateBondData() {
  console.log("Fetching bond and treasury data for table...");
  try {
    const res = await fetch("/.netlify/functions/getAllBondData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    // Update Global Last Updated Timestamp above the table
    if (data.last_updated) {
      // Assuming the timestamp "2025-07-07 14:20:03" is UTC, we append 'Z' for proper parsing.
      // If your Firebase timestamp is in a specific timezone, you might need 'YYYY-MM-DDTHH:MM:SS-OFFSET'
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
        // Construct the unique prefix for table IDs: e.g., "umbs55table" or "umbs55shadowtable"
        const prefix = instrumentKey.toLowerCase().replace(/_/g, '') + 'table';

        // Update values using the new unique IDs
        updateChangeIndicator(`${prefix}Current`, `${prefix}Change`,
                              instrumentData.current, instrumentData.change);

        updateTextElement(`${prefix}Open`, formatValue(instrumentData.open));
        updateTextElement(`${prefix}High`, formatValue(instrumentData.high));
        updateTextElement(`${prefix}Low`, formatValue(instrumentData.low));
        updateTextElement(`${prefix}PrevClose`, formatValue(instrumentData.prevClose));

        // The 'Updated' column in HTML remains '--' as your JSON doesn't provide per-instrument timestamps.
        // updateTextElement(`${prefix}Updated`, formatValue(instrumentData.someIndividualTimestamp));
        // For now, it will default to '--' based on how your HTML is structured.
      } else {
        console.warn(`Data for ${instrumentKey} not found in bond data. Setting defaults.`);
        const prefix = instrumentKey.toLowerCase().replace(/_/g, '') + 'table';
        updateTextElement(`${prefix}Current`, '--');
        updateTextElement(`${prefix}Change`, '--');
        updateTextElement(`${prefix}Open`, '--');
        updateTextElement(`${prefix}High`, '--');
        updateTextElement(`${prefix}Low`, '--');
        updateTextElement(`${prefix}PrevClose`, '--');
        updateTextElement(`${prefix}Updated`, '--'); // Ensure this is also reset
      }
    });

  } catch (err) {
    console.error("Bond data fetch error:", err);
    updateTextElement('bondLastUpdated', `Last Updated: Error`);
    // On error, set all table values to '--'
    const bondInstruments = [
        "UMBS_5_5", "UMBS_6_0", "GNMA_5_5", "GNMA_6_0",
        "UMBS_5_5_Shadow", "UMBS_6_0_Shadow", "GNMA_5_5_Shadow", "GNMA_6_0_Shadow"
    ];
    bondInstruments.forEach(instrumentKey => {
        const prefix = instrumentKey.toLowerCase().replace(/_/g, '') + 'table';
        updateTextElement(`${prefix}Current`, '--');
        updateTextElement(`${prefix}Change`, '--');
        updateTextElement(`${prefix}Open`, '--');
        updateTextElement(`${prefix}High`, '--');
        updateTextElement(`${prefix}Low`, '--');
        updateTextElement(`${prefix}PrevClose`, '--');
        updateTextElement(`${prefix}Updated`, '--');
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
  setInterval(fetchAndUpdateMarketData, 60000); // Market Snapshot: Every 60 seconds
  setInterval(fetchAndUpdateLiveStockData, 30000); // Live Stocks: Every 30 seconds
  setInterval(fetchAndUpdateBondData, 60000); // Bonds & Treasuries Table: Refresh every 60 seconds
  // Daily Rates and Economic Indicators are not currently on a setInterval, you can add them if needed.
});
