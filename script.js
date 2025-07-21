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
    console.log(`DEBUG (updateTextElement): Updated element '${elementId}' with value: '${value}'`);
  } else {
    console.warn(`DEBUG (updateTextElement): Element with ID '${elementId}' NOT FOUND!`);
  }
}

// Function to update a value and apply color based on a separate change value
// Used for: US10Y/US30Y Yields, 30Y/15Y Fixed Rates (top snapshot)
function updateValueWithColorBasedOnChange(valueElementId, changeValue, isInverted = false) {
  const valueElement = document.getElementById(valueElementId);
  if (!valueElement) {
    console.warn(`DEBUG (updateValueWithColorBasedOnChange): Value element with ID '${valueElementId}' NOT FOUND!`);
    return;
  }

  const numericChange = parseFloat(changeValue);

  // Determine positive/negative flags
  let isPositiveChange = false;
  let isNegativeChange = false;
  if (!isNaN(numericChange)) {
    if (numericChange > 0) {
      isPositiveChange = true;
    } else if (numericChange < 0) {
      isNegativeChange = true;
    }
  }

  // Remove existing color classes first
  valueElement.classList.remove('positive', 'negative');
  // Also remove background classes from parent header item if it exists
  const parentHeaderItem = valueElement.closest('.header-item');
  if (parentHeaderItem) {
    parentHeaderItem.classList.remove('positive-bg', 'negative-bg', 'neutral-bg');
  }


  // Apply new color classes based on flags and isInverted
  if (isInverted) { // For Treasuries and Rates (higher value/change is 'negative')
    if (isPositiveChange) {
      valueElement.classList.add('negative'); // Red for positive change
      if (parentHeaderItem) parentHeaderItem.classList.add('negative-bg');
    } else if (isNegativeChange) {
      valueElement.classList.add('positive'); // Green for negative change
      if (parentHeaderItem) parentHeaderItem.classList.add('positive-bg');
    } else {
      if (parentHeaderItem) parentHeaderItem.classList.add('neutral-bg');
    }
  } else { // For MBS/Equities (default: positive change is 'positive')
    if (isPositiveChange) {
      valueElement.classList.add('positive');
      if (parentHeaderItem) parentHeaderItem.classList.add('positive-bg');
    } else if (isNegativeChange) {
      valueElement.classList.add('negative');
      if (parentHeaderItem) parentHeaderItem.classList.add('negative-bg');
    } else {
      if (parentHeaderItem) parentHeaderItem.classList.add('neutral-bg');
    }
  }
  // The actual text content of valueElementId is updated by updateTextElement in the main fetch functions.
  // This function only applies color.
  console.log(`DEBUG (updateValueWithColorBasedOnChange): Applied color to '${valueElementId}' based on change '${changeValue}' (inverted: ${isInverted})`);
}


// Function to update a dedicated 'change' element's text and color
// Used for: MBS Today, Treasuries Today, Equities Today, Daily Mortgage Rates Change column
function updateChangeTextAndColor(changeElementId, change, isInverted = false) {
  const changeElement = document.getElementById(changeElementId);
  if (!changeElement) {
    console.warn(`DEBUG (updateChangeTextAndColor): Change element with ID '${changeElementId}' NOT FOUND!`);
    return;
  }

  let formattedChange = formatValue(change);
  const numericChange = parseFloat(change);

  // Determine positive/negative flags
  let isPositiveChange = false;
  let isNegativeChange = false;
  if (!isNaN(numericChange)) {
    if (numericChange > 0) {
      formattedChange = `+${formattedChange}`;
      isPositiveChange = true;
    } else if (numericChange < 0) {
      isNegativeChange = true;
    }
  }

  // Apply highlight only if the change value itself is different
  if (changeElement.textContent !== formattedChange) {
    changeElement.classList.remove('highlight-on-update');
    void changeElement.offsetWidth; // Trigger reflow
    changeElement.classList.add('highlight-on-update');
  }

  // Remove existing color classes first
  changeElement.classList.remove('positive', 'negative');
  const parentHeaderItem = changeElement.closest('.header-item'); // Get parent for background
  if (parentHeaderItem) {
    parentHeaderItem.classList.remove('positive-bg', 'negative-bg', 'neutral-bg');
  }


  // Apply new color classes based on flags and isInverted
  if (isInverted) { // For Treasuries and Rates (higher yield/rate is 'negative')
    if (isPositiveChange) {
      changeElement.classList.add('negative'); // Red for positive change
      if (parentHeaderItem) parentHeaderItem.classList.add('negative-bg');
    } else if (isNegativeChange) {
      changeElement.classList.add('positive'); // Green for negative change
      if (parentHeaderItem) parentHeaderItem.classList.add('positive-bg');
    } else {
      if (parentHeaderItem) parentHeaderItem.classList.add('neutral-bg');
    }
  } else { // For MBS/Equities (default: positive change is 'positive')
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
  changeElement.textContent = formattedChange;
  console.log(`DEBUG (updateChangeTextAndColor): Updated change element '${changeElementId}' with value: '${formattedChange}'`);
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
  console.log(`DEBUG (formatDate): Received dateString: '${dateString}' (type: ${typeof dateString})`);
  if (!dateString || dateString === "N/A" || dateString === "--") {
    return "--";
  }
  try {
    const parts = String(dateString).split('-'); // Ensure it's a string before splitting
    if (parts.length === 3) {
      const formatted = `${parts[1]}/${parts[2]}/${parts[0]}`;
      console.log(`DEBUG (formatDate): Formatted to: '${formatted}'`);
      return formatted;
    }
    console.log(`DEBUG (formatDate): Returning original dateString (not YYYY-MM-DD format): '${dateString}'`);
    return dateString;
  } catch (e) {
    console.error("Error formatting date:", e, dateString);
    return "--";
  }
}


// --- Market Data ---
async function fetchAndUpdateMarketData() {
  console.log("Fetching market data...");
  try {
    const res = await fetch("/.netlify/functions/getTopDashboardData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    if (data?.US10Y) {
      const y = parseFloat(data.US10Y.yield);
      const c = parseFloat(data.US10Y.change);
      updateTextElement('us10yValue', isNaN(y) ? "--" : y.toFixed(3)); // Update value
      updateValueWithColorBasedOnChange('us10yValue', isNaN(c) ? "--" : c.toFixed(3), true); // Apply color to value (inverted)
    }

    if (data?.US30Y) {
      const y = parseFloat(data.US30Y.yield);
      const c = parseFloat(data.US30Y.change);
      updateTextElement('us30yValue', isNaN(y) ? "--" : y.toFixed(3)); // Update value
      updateValueWithColorBasedOnChange('us30yValue', isNaN(c) ? "--" : c.toFixed(3), true); // Apply color to value (inverted)
    }

    if (data?.UMBS_5_5) {
      const v = parseFloat(data.UMBS_5_5.current);
      const c = parseFloat(data.UMBS_5_5.change); // This 'change' comes from Firestore `Daily_Change`
      updateTextElement('umbs55Value', isNaN(v) ? "--" : v.toFixed(3)); // Update value
      updateChangeTextAndColor('umbs55Change', isNaN(c) ? "--" : c.toFixed(3)); // Update change (not inverted)
    }

    if (data?.GNMA_5_5) {
      const v = parseFloat(data.GNMA_5_5.current);
      const c = parseFloat(data.GNMA_5_5.change); // This 'change' comes from Firestore `Daily_Change`
      updateTextElement('gnma55Value', isNaN(v) ? "--" : v.toFixed(3)); // Update value
      updateChangeTextAndColor('gnma55Change', isNaN(c) ? "--" : c.toFixed(3)); // Update change (not inverted)
    }
  } catch (err) {
    console.error("Market data fetch error:", err);
  }
}

// --- Daily Rates ---
async function fetchAndUpdateDailyRates() {
  console.log("Fetching daily rates...");
  try {
    const res = await fetch("/.netlify/functions/getDailyRatesData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    console.log("DEBUG (fetchAndUpdateDailyRates): Received data from Netlify function:", data);

    function updateRateRow(prefix, rateData) {
      console.log(`DEBUG (updateRateRow): Processing ${prefix}. rateData:`, rateData);

      if (!rateData) {
        console.warn(`DEBUG (updateRateRow): rateData is null/undefined for ${prefix}. Setting all to '--'.`);
        updateTextElement(`${prefix}Current`, '--');
        updateTextElement(`${prefix}YesterdayTable`, '--'); // Assuming this ID exists for tables
        updateTextElement(`${prefix}LastMonth`, '--');
        updateTextElement(`${prefix}YearAgo`, '--');
        updateTextElement(`${prefix}ChangeVs1M`, '--');
        updateTextElement(`${prefix}ChangeVs1Y`, '--');
        // Removed: updateTextElement(`${prefix}DailyChange`, '--'); // Reset daily change as well
        return;
      }

      // Apply color directly to the Current rate based on daily_change
      updateTextElement(`${prefix}Current`, formatPercentage(rateData.latest));
      updateValueWithColorBasedOnChange(`${prefix}Current`, rateData.daily_change, true); // isInverted = true for rates

      console.log(`DEBUG (updateRateRow): Attempting to update ${prefix}Current with value: ${rateData.latest}`);


      // Use rateData.yesterday for all, as the Netlify function should provide it consistently
      // The HTML IDs are already set up to match this pattern or specific table IDs
      if (prefix === "fixed30y") {
        updateTextElement("fixed30yYesterdayTable", formatPercentage(rateData.yesterday));
        console.log(`DEBUG (updateRateRow): Attempting to update fixed30yYesterdayTable with value: ${rateData.yesterday}`);
      } else if (prefix === "fixed15y") {
        updateTextElement("fixed15yYesterdayTable", formatPercentage(rateData.yesterday));
        console.log(`DEBUG (updateRateRow): Attempting to update fixed15yYesterdayTable with value: ${rateData.yesterday}`);
      } else { // Generic for other rates like VA, FHA, Jumbo, USDA
        updateTextElement(`${prefix}Yesterday`, formatPercentage(rateData.yesterday));
        console.log(`DEBUG (updateRateRow): Attempting to update ${prefix}Yesterday with value: ${rateData.yesterday}`);
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

      // Removed: Logic for Daily Change column
    }

    // Top snapshot - MODIFIED TO FIX MISSING YESTERDAY DATA AND ENSURE COLORING
    // Fixed30Y
    if (data?.fixed30Y) {
        const latest30Y = parseFloat(data.fixed30Y.latest);
        const dailyChange30Y = parseFloat(data.fixed30Y.daily_change);
        const yesterday30Y = parseFloat(data.fixed30Y.yesterday);
        
        updateTextElement("fixed30yValue", formatPercentage(latest30Y)); // Update value
        updateValueWithColorBasedOnChange("fixed30yValue", dailyChange30Y, true); // Apply color to value based on change
        updateTextElement("fixed30yYesterday", formatPercentage(yesterday30Y)); // Update Yesterday value
    } else {
        updateTextElement("fixed30yValue", "--");
        updateTextElement("fixed30yYesterday", "--");
    }

    // Fixed15Y
    if (data?.fixed15Y) { // Note: using 'fixed15Y' as per your Netlify function output
        const latest15Y = parseFloat(data.fixed15Y.latest);
        const dailyChange15Y = parseFloat(data.fixed15Y.daily_change);
        const yesterday15Y = parseFloat(data.fixed15Y.yesterday);

        updateTextElement("fixed15yValue", formatPercentage(latest15Y)); // Update value
        updateValueWithColorBasedOnChange("fixed15yValue", dailyChange15Y, true); // Apply color to value based on change
        updateTextElement("fixed15yYesterday", formatPercentage(yesterday15Y)); // Update Yesterday value
    } else {
        updateTextElement("fixed15yValue", "--");
        updateTextElement("fixed15yYesterday", "--");
    }

    // Table rows - MODIFIED: Corrected casing for jumbo30y and usda30y
    updateRateRow("fixed30y", data.fixed30Y);
    updateRateRow("va30y", data.va30Y);
    updateRateRow("fha30y", data.fha30Y);
    updateRateRow("jumbo30y", data.jumbo30Y); // Corrected to data.jumbo30Y
    updateRateRow("usda30y", data.usda30Y); // Corrected to data.usda30Y
    updateRateRow("fixed15y", data.fixed15Y); // Corrected to data.fixed15Y

  } catch (err) {
    console.error("Daily Rates fetch error:", err);
  }
}

// --- Live Stocks ---
async function fetchAndUpdateLiveStockData() {
  console.log("Fetching live stock data...");
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
          const t = n.toFixed(2);
          if (n > 0) {
            formattedChange = `+${t}%`;
            el.classList.add('positive');
          } else if (n < 0) {
            formattedChange = `${t}%`;
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
  console.log("Fetching economic indicators...");
  try {
    const res = await fetch("/.netlify/functions/getEconomicIndicatorsData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    console.log("DEBUG (fetchAndUpdateEconomicIndicators): Received data from Netlify function:", data);

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
    console.log("Fetching bond and treasury data for table...");
    try {
        const res = await fetch("/.netlify/functions/getAllBondData");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();

        // Re-added timestamp update for bondLastUpdated
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
            "US10Y",
            "US30Y",
            "UMBS_5_5", "UMBS_6_0", "GNMA_5_5", "GNMA_6_0",
            "UMBS_5_5_Shadow", "UMBS_6_0_Shadow", "GNMA_5_5_Shadow", "GNMA_6_0_Shadow"
        ];

        bondInstruments.forEach(instrumentKey => {
            const instrumentData = data[instrumentKey];
            let baseId = instrumentKey.toLowerCase().replace(/_/g, ''); // Default conversion
            
            // Special handling for GNMA_6_0_Shadow to match HTML ID
            if (instrumentKey === "GNMA_6_0_Shadow") {
                baseId = "gnma60shadow"; // Ensure it matches the HTML ID exactly
            }

            const tableIdPrefix = `${baseId}Table`;

            // Determine if the instrument is a Treasury (US10Y or US30Y) for inverted color logic
            const isInvertedColors = (instrumentKey === "US10Y" || instrumentKey === "US30Y");

            if (instrumentData) {
                console.log(`--- Data for ${instrumentKey} ---`);
                console.log(`Current: ${instrumentData.current}, Change: ${instrumentData.change}, Open: ${instrumentData.open}`);
                console.log(`High: ${instrumentData.high}, Low: ${instrumentData.low}, PrevClose: ${instrumentData.prevClose}`);
                console.log(`--- End ${instrumentKey} Data ---`);

                updateTextElement(`${tableIdPrefix}Current`, formatValue(instrumentData.current)); // Update current value text
                updateChangeTextAndColor(`${tableIdPrefix}Change`, instrumentData.change, isInvertedColors); // Apply color to change element

                updateTextElement(`${tableIdPrefix}Open`, formatValue(instrumentData.open));
                updateTextElement(`${tableIdPrefix}High`, formatValue(instrumentData.high));
                updateTextElement(`${tableIdPrefix}Low`, formatValue(instrumentData.low));
                updateTextElement(`${tableIdPrefix}PrevClose`, formatValue(instrumentData.prevClose));
                
                // Re-added: Update the 'Updated' column with the specific instrument's timestamp if available
                // Otherwise, fall back to the global timestamp or '--'
                let instrumentUpdatedTime = formattedTimestampForTable; // Default to global
                if (instrumentData.last_updated) { // Check if individual instrument has a timestamp
                    const individualTimestamp = new Date(instrumentData.last_updated.replace(' ', 'T'));
                    instrumentUpdatedTime = individualTimestamp.toLocaleString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                        timeZone: 'America/Los_Angeles',
                        timeZoneName: 'short'
                    });
                }
                updateTextElement(`${tableIdPrefix}Updated`, instrumentUpdatedTime);

            } else {
                console.warn(`Data for ${instrumentKey} not found in bond data. Setting defaults.`);
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
        // Ensure all rows are reset to default on error
        const bondInstruments = [
            "US10Y", "US30Y",
            "UMBS_5_5", "UMBS_6_0", "GNMA_5_5", "GNMA_6_0",
            "UMBS_5_5_Shadow", "UMBS_6_0_Shadow", "GNMA_5_5_Shadow", "GNMA_6_0_Shadow"
        ];
        bondInstruments.forEach(instrumentKey => {
            let baseId = instrumentKey.toLowerCase().replace(/_/g, '');
            if (instrumentKey === "GNMA_6_0_Shadow") {
                baseId = "gnma60shadow";
            }
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

  setInterval(fetchAndUpdateMarketData, 30000); // Every 30 seconds
  setInterval(fetchAndUpdateLiveStockData, 30000); // Every 30 seconds
  setInterval(fetchAndUpdateBondData, 30000); // Every 30 seconds
  setInterval(fetchAndUpdateDailyRates, 1800000); // Every 60 seconds
  setInterval(fetchAndUpdateEconomicIndicators, 900000); // Every 5 minutes
});
