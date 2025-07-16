// --- Helper Functions ---
function updateTextElement(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    // Check if the value is actually changing before applying highlight
    if (element.textContent !== String(value)) { // Convert value to string for comparison
      // Remove the class first to reset the animation
      element.classList.remove('highlight-on-update');
      // Trigger reflow to restart the animation
      void element.offsetWidth; // This forces a reflow
      // Add the class back
      element.classList.add('highlight-on-update');
    }
    element.textContent = value;
    // console.log(`DEBUG (updateTextElement): Updated element '${elementId}' with value: '${value}'`); // Commented for less console noise
  } else {
    // console.warn(`Element with ID '${elementId}' NOT FOUND!`); // Commented for less console noise
  }
}

// MODIFIED: Added isInverted parameter for color logic, and highlight logic
function updateChangeIndicator(valueElementId, changeElementId, value, change, isInverted = false) {
  updateTextElement(valueElementId, formatValue(value)); // This will apply highlight to the value

  const changeElement = document.getElementById(changeElementId);
  // Note: .closest('.header-item') might not be relevant for all elements,
  // but keeping it for compatibility with existing HTML structure.
  const parentHeaderItem = changeElement ? changeElement.closest('.header-item') : null;

  if (changeElement) {
    let formattedChange = formatValue(change);
    changeElement.classList.remove('positive', 'negative');
    if (parentHeaderItem) {
      parentHeaderItem.classList.remove('positive-bg', 'negative-bg', 'neutral-bg'); // Reset all background classes
    }

    let isPositiveChange = false;
    let isNegativeChange = false;

    const numericChange = parseFloat(change);
    if (!isNaN(numericChange)) {
      if (numericChange > 0) {
        formattedChange = `+${numericChange}`;
        isPositiveChange = true;
      } else if (numericChange < 0) {
        formattedChange = `${numericChange}`;
        isNegativeChange = true;
      }
    }

    // Apply colors based on isInverted flag
    if (isInverted) { // For Treasuries (and now Rates, where higher yield/rate is 'negative' for bond prices/borrowers)
      if (isPositiveChange) {
        changeElement.classList.add('negative'); // Red for positive change (higher yield/rate)
        if (parentHeaderItem) parentHeaderItem.classList.add('negative-bg');
      } else if (isNegativeChange) {
        changeElement.classList.add('positive'); // Green for negative change (lower yield/rate)
        if (parentHeaderItem) parentHeaderItem.classList.add('positive-bg');
      } else {
        if (parentHeaderItem) parentHeaderItem.classList.add('neutral-bg');
      }
    } else { // For MBS/Equities (default behavior: positive change is 'positive')
      if (isPositiveChange) {
        changeElement.classList.add('positive');
        if (parentHeaderItem) parentHeaderItem.classList.add('positive-bg');
      } else if (isNegativeChange) {
        changeElement.classList.add('negative');
        if (parentHeaderItem) parentHeaderItem.classList.add('negative-bg');
      } else {
        if (parentHeaderItem) parentHeaderItem.classList.add('neutral-bg');
      }
    }

    // Apply highlight only if the change value itself is different
    if (changeElement.textContent !== formattedChange) {
      changeElement.classList.remove('highlight-on-update');
      void changeElement.offsetWidth; // Trigger reflow
      changeElement.classList.add('highlight-on-update');
    }
    changeElement.textContent = formattedChange;
    // console.log(`DEBUG (updateChangeIndicator): Updated change element '${changeElementId}' with value: '${formattedChange}'`); // Commented for less console noise
  } else {
    // console.warn(`DEBUG (updateChangeIndicator): Change element with ID '${changeElementId}' NOT FOUND!`); // Commented for less console noise
  }
}

function formatValue(val) {
  const num = parseFloat(val);
  if (!isNaN(num)) {
    return num.toFixed(3);
  }
  return val !== null && val !== undefined && val !== "" ? val : "--";
}

function formatPercentage(val) {
  const formatted = formatValue(val);
  return formatted !== '--' ? `${formatted}%` : '--';
}

// Helper function for formatting dates
function formatDate(dateString) {
  // console.log(`DEBUG (formatDate): Received dateString: '${dateString}' (type: ${typeof dateString})`); // Commented for less console noise
  if (!dateString || dateString === "N/A" || dateString === "--") {
    return "--";
  }
  try {
    const parts = String(dateString).split('-'); // Ensure it's a string before splitting
    if (parts.length === 3) {
      const formatted = `${parts[1]}/${parts[2]}/${parts[0]}`;
      // console.log(`DEBUG (formatDate): Formatted to: '${formatted}'`); // Commented for less console noise
      return formatted;
    }
    // console.log(`DEBUG (formatDate): Returning original dateString (not YYYY-MM-DD format): '${dateString}'`); // Commented for less console noise
    return dateString;
  } catch (e) {
    console.error("Error formatting date:", e, dateString);
    return "--";
  }
}


// --- Market Data ---
async function fetchAndUpdateMarketData() {
  // console.log("Fetching market data..."); // Commented for less console noise
  try {
    const res = await fetch("/.netlify/functions/getTopDashboardData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    if (data?.US10Y) {
      const y = parseFloat(data.US10Y.yield);
      const c = parseFloat(data.US10Y.change);
      updateChangeIndicator('us10yValue', 'us10yChange',
        isNaN(y) ? "--" : y.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3),
        true
      );
    }

    if (data?.US30Y) {
      const y = parseFloat(data.US30Y.yield);
      const c = parseFloat(data.US30Y.change);
      updateChangeIndicator('us30yValue', 'us30yChange',
        isNaN(y) ? "--" : y.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3),
        true
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

// --- Daily Rates ---
async function fetchAndUpdateDailyRates() {
  // console.log("Fetching daily rates..."); // Commented for less console noise
  try {
    const res = await fetch("/.netlify/functions/getDailyRatesData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    // console.log("DEBUG (fetchAndUpdateDailyRates): Received data from Netlify function:", data); // Commented for less console noise

    function updateRateRow(prefix, rateData) {
      // console.log(`DEBUG (updateRateRow): Processing ${prefix}. rateData:`, rateData); // Commented for less console noise

      if (!rateData) {
        // console.warn(`DEBUG (updateRateRow): rateData is null/undefined for ${prefix}. Setting all to '--'.`); // Commented for less console noise
        updateTextElement(`${prefix}Current`, '--');
        updateTextElement(`${prefix}YesterdayTable`, '--'); // Assuming this ID exists for tables
        updateTextElement(`${prefix}LastMonth`, '--');
        updateTextElement(`${prefix}YearAgo`, '--');
        updateTextElement(`${prefix}ChangeVs1M`, '--');
        updateTextElement(`${prefix}ChangeVs1Y`, '--');
        updateTextElement(`${prefix}DailyChange`, '--'); // Reset daily change as well
        return;
      }

      updateTextElement(`${prefix}Current`, formatPercentage(rateData.latest));
      // console.log(`DEBUG (updateRateRow): Attempting to update ${prefix}Current with value: ${rateData.latest}`); // Commented for less console noise


      // Use rateData.yesterday for all, as the Netlify function should provide it consistently
      // The HTML IDs are already set up to match this pattern or specific table IDs
      if (prefix === "fixed30y") {
        updateTextElement("fixed30yYesterdayTable", formatPercentage(rateData.yesterday));
      } else if (prefix === "fixed15y") {
        updateTextElement("fixed15yYesterdayTable", formatPercentage(rateData.yesterday));
      } else { // Generic for other rates like VA, FHA, Jumbo, USDA
        updateTextElement(`${prefix}Yesterday`, formatPercentage(rateData.yesterday));
      }

      updateTextElement(`${prefix}LastMonth`, formatPercentage(rateData.last_month));
      updateTextElement(`${prefix}YearAgo`, formatPercentage(rateData.year_ago);

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

      // NEW: Update Daily Change and apply colors
      if (rateData.daily_change !== undefined && rateData.daily_change !== null) {
        const dailyChangeNumeric = parseFloat(rateData.daily_change);
        const dailyChangeElementId = `${prefix}DailyChange`;
        
        // Apply colors: red for higher (positive change), green for lower (negative change)
        updateChangeIndicator(dailyChangeElementId, dailyChangeElementId, // Pass same ID for value and change
                              dailyChangeNumeric, dailyChangeNumeric, true); // isInverted = true for rates
      } else {
        updateTextElement(`${prefix}DailyChange`, '--');
      }
    }

    // Top snapshot
    updateTextElement("fixed30yValue", formatPercentage(data?.fixed30Y?.latest));
    updateTextElement("fixed30yYesterday", formatPercentage(data?.fixed30Y?.yesterday));
    updateTextElement("fixed15yValue", formatPercentage(data?.fixed15y?.latest));
    updateTextElement("fixed15yYesterday", formatPercentage(data?.fixed15y?.yesterday));

    // Table rows
    updateRateRow("fixed30y", data.fixed30Y);
    updateRateRow("va30y", data.va30Y);
    updateRateRow("fha30y", data.fha30Y);
    updateRateRow("jumbo30y", data.jumbo30y);
    updateRateRow("usda30y", data.usda30y);
    updateRateRow("fixed15y", data.fixed15y);

  } catch (err) {
    console.error("Daily Rates fetch error:", err);
  }
}

// --- Live Stocks ---
async function fetchAndUpdateLiveStockData() {
  // console.log("Fetching live stock data..."); // Commented for less console noise
  try {
    const res = await fetch("/.netlify/functions/getLiveStockData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    function updateStockChange(id, item) {
      const el = document.getElementById(id);
      if (!el) return;

      let formattedChange = '--';
      el.classList.remove('positive', 'negative', 'highlight-on-update'); // Remove highlight too

      if (item && item.percentChange !== undefined) {
        const n = parseFloat(item.percentChange);
        if (!isNaN(n)) {
          formattedChange = n.toFixed(2);
          if (n > 0) {
            formattedChange = `+${formattedChange}%`;
            el.classList.add('positive');
          } else if (n < 0) {
            formattedChange = `${formattedChange}%`;
            el.classList.add('negative');
          } else {
            formattedChange = '0.00%';
          }
        }
      }

      if (el.textContent !== formattedChange) { // Apply highlight only if content changes
        el.classList.remove('highlight-on-update');
        void el.offsetWidth; // Trigger reflow
        el.classList.add('highlight-on-update');
      }
      el.textContent = formattedChange;
    }

    updateStockChange('spyChange', data.SPY);
    updateStockChange('qqqChange', data.QQQ);
    updateStockChange('diaChange', data.DIA);
  } catch (err) {
    console.error("Stock data fetch error:", err);
  }
}

// --- Economic Indicators ---
async function fetchAndUpdateEconomicIndicators() {
  // console.log("Fetching economic indicators..."); // Commented for less console noise
  try {
    const res = await fetch("/.netlify/functions/getEconomicIndicatorsData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    // console.log("DEBUG (fetchAndUpdateEconomicIndicators): Received data from Netlify function:", data); // Commented for less console noise

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
      updateTextElement(`${prefix}Date`, formatDate(d.latest_date));
      updateTextElement(`${prefix}LastMonth`, formatValue(d.last_month));
      updateTextElement(`${prefix}YearAgo`, formatValue(d.year_ago));
      updateTextElement(`${prefix}NextRelease`, formatValue(d.next_release));
      updateTextElement(`${prefix}CoveragePeriod`, formatValue(d.coverage_period));
    });
  } catch (err) {
    console.error("Economic Indicators fetch error:", err);
  }
}

// --- Bonds & Treasuries ---
async function fetchAndUpdateBondData() {
    // console.log("Fetching bond and treasury data for table..."); // Commented for less console noise
    try {
        const res = await fetch("/.netlify/functions/getAllBondData");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();

        let formattedTimestampForTable = '--';
        if (data.last_updated) {
            const timestamp = new Date(data.last_updated.replace(' ', 'T'));
            formattedTimestampForTable = timestamp.toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
                timeZone: 'America/Los_Angeles', // Ensure this matches your data's timezone or desired display timezone
                timeZoneName: 'short'
            });
            updateTextElement('bondLastUpdated', `Last Updated: ${formattedTimestampForTable}`);
        } else {
            updateTextElement('bondLastUpdated', `Last Updated: --`);
        }

        const bondInstruments = [
            "US10Y", "US30Y",
            "UMBS_5_5", "UMBS_6_0", "GNMA_5_5", "GNMA_6_0",
            "UMBS_5_5_Shadow", "UMBS_6_0_Shadow", "GNMA_5_5_Shadow", "GNMA_6_0_Shadow"
        ];

        bondInstruments.forEach(instrumentKey => {
            const instrumentData = data[instrumentKey];
            const baseId = instrumentKey.toLowerCase().replace(/_/g, '');
            const tableIdPrefix = `${baseId}Table`;

            const isInvertedColors = (instrumentKey === "US10Y" || instrumentKey === "US30Y");

            if (instrumentData) {
                // console.log(`--- Data for ${instrumentKey} ---`); // Commented for less console noise
                // console.log(`Current: ${instrumentData.current}, Change: ${instrumentData.change}, Open: ${instrumentData.open}`); // Commented for less console noise
                // console.log(`High: ${instrumentData.high}, Low: ${instrumentData.low}, PrevClose: ${instrumentData.prevClose}`); // Commented for less console noise
                // console.log(`--- End ${instrumentKey} Data ---`); // Commented for less console noise

                updateChangeIndicator(`${tableIdPrefix}Current`, `${tableIdPrefix}Change`,
                                      instrumentData.current, instrumentData.change, isInvertedColors);

                updateTextElement(`${tableIdPrefix}Open`, formatValue(instrumentData.open));
                updateTextElement(`${tableIdPrefix}High`, formatValue(instrumentData.high));
                updateTextElement(`${tableIdPrefix}Low`, formatValue(instrumentData.low));
                updateTextElement(`${tableIdPrefix}PrevClose`, formatValue(instrumentData.prevClose));
                updateTextElement(`${tableIdPrefix}Updated`, formattedTimestampForTable);

            } else {
                // console.warn(`Data for ${instrumentKey} not found in bond data. Setting defaults.`); // Commented for less console noise
                updateTextElement(`${tableIdPrefix}Current`, '--');
                updateTextElement(`${tableIdPrefix}Change`, '--');
                updateTextElement(`${tableIdPrefix}Open`, '--');
                updateTextElement(`${tableIdPrefix}High`, '--');
                updateTextElement(`${tableIdPrefix}Low`, '--');
                updateTextElement(`${tableIdPrefix}PrevClose`, '--');
                updateTextElement(`${tableIdPrefix}Updated`, '--');
            }
        });

    } catch (err) {
        console.error("Bond data fetch error:", err);
        updateTextElement('bondLastUpdated', `Last Updated: Error`);
        const bondInstruments = [
            "US10Y", "US30Y",
            "UMBS_5_5", "UMBS_6_0", "GNMA_5_5", "GNMA_6_0",
            "UMBS_5_5_Shadow", "UMBS_6_0_Shadow", "GNMA_5_5_Shadow", "GNMA_6_0_Shadow"
        ];
        bondInstruments.forEach(instrumentKey => {
            const baseId = instrumentKey.toLowerCase().replace(/_/g, '');
            const tableIdPrefix = `${baseId}Table`;
            updateTextElement(`${tableIdPrefix}Current`, '--');
            updateTextElement(`${tableIdPrefix}Change`, '--');
            updateTextElement(`${tableIdPrefix}Open`, '--');
            updateTextElement(`${tableIdPrefix}High`, '--');
            updateTextElement(`${tableIdPrefix}Low`, '--');
            updateTextElement(`${tableIdPrefix}PrevClose`, '--');
            updateTextElement(`${tableIdPrefix}Updated`, '--');
        });
    }
}

// --- Initialize & Refresh ---
document.addEventListener("DOMContentLoaded", () => {
  fetchAndUpdateMarketData();
  fetchAndUpdateDailyRates();
  fetchAndUpdateLiveStockData();
  fetchAndUpdateEconomicIndicators();
  fetchAndUpdateBondData();

  // Increased refresh rate for market and bond data
  setInterval(fetchAndUpdateMarketData, 30000); // Every 30 seconds
  setInterval(fetchAndUpdateLiveStockData, 30000); // Every 30 seconds
  setInterval(fetchAndUpdateBondData, 30000); // Every 30 seconds
  // Economic indicators and daily rates typically don't change as frequently,
  // so keeping them at default or slightly longer intervals might be efficient.
  // For now, let's keep daily rates at 60s, economic indicators at 5 minutes (300000ms)
  setInterval(fetchAndUpdateDailyRates, 60000); // Every 60 seconds
  setInterval(fetchAndUpdateEconomicIndicators, 300000); // Every 5 minutes
});
