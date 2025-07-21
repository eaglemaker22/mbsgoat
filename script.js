// --- Helper Functions ---

/**
 * Updates the text content of an HTML element and applies a highlight animation.
 * @param {string} elementId - The ID of the HTML element to update.
 * @param {string|number} value - The new value to set as the text content.
 */
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

/**
 * Updates a value element's text and applies color to it and its parent based on a change value.
 * This is typically used for the main display values in the snapshot sections (e.g., Yields, Rates).
 * @param {string} valueElementId - The ID of the HTML element displaying the main value.
 * @param {string|number} value - The main value to display.
 * @param {string|number} change - The change value used to determine the color.
 * @param {boolean} [isInverted=false] - If true, positive change is red, negative is green.
 */
function updateValueAndColor(valueElementId, value, change, isInverted = false) {
  const valueElement = document.getElementById(valueElementId);
  if (!valueElement) {
    console.warn(`DEBUG (updateValueAndColor): Value element with ID '${valueElementId}' NOT FOUND!`);
    return;
  }

  // First, update the text content of the value element
  updateTextElement(valueElementId, formatValue(value));

  const numericChange = parseFloat(change);

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
  if (isInverted) { // For Treasuries and Rates (higher value/change is 'negative' for bond prices/borrowers)
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
  console.log(`DEBUG (updateValueAndColor): Applied color to '${valueElementId}' based on change '${change}' (inverted: ${isInverted})`);
}

/**
 * Updates a dedicated 'change' element's text and color.
 * This is typically used for the "Today" column in snapshot or "Change" column in tables.
 * @param {string} changeElementId - The ID of the HTML element displaying the change.
 * @param {string|number} change - The change value.
 * @param {boolean} [isInverted=false] - If true, positive change is red, negative is green.
 */
function updateChangeTextAndColor(changeElementId, change, isInverted = false) {
  const changeElement = document.getElementById(changeElementId);
  if (!changeElement) {
    console.warn(`DEBUG (updateChangeTextAndColor): Change element with ID '${changeElementId}' NOT FOUND!`);
    return;
  }

  let formattedChange = formatValue(change);
  const numericChange = parseFloat(change);

  // Determine positive/negative flags and add '+' prefix if positive
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

/**
 * Formats a numeric value to 3 decimal places, or returns '--' if invalid.
 * @param {string|number} val - The value to format.
 * @returns {string} The formatted value.
 */
function formatValue(val) {
  const num = parseFloat(val);
  if (!isNaN(num)) {
    return num.toFixed(3);
  }
  return val !== null && val !== undefined && val !== "" ? val : "--";
}

/**
 * Formats a numeric value as a percentage to 3 decimal places, or returns '--'.
 * @param {string|number} val - The value to format.
 * @returns {string} The formatted percentage.
 */
function formatPercentage(val) {
  const formatted = formatValue(val);
  return formatted !== '--' ? `${formatted}%` : '--';
}

/**
 * Formats a date string from YYYY-MM-DD to MM/DD/YYYY.
 * @param {string} dateString - The date string to format.
 * @returns {string} The formatted date or '--'.
 */
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
/**
 * Fetches and updates market snapshot data (MBS, Treasuries).
 */
async function fetchAndUpdateMarketData() {
  console.log("Fetching market data...");
  try {
    const res = await fetch("/.netlify/functions/getTopDashboardData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    console.log("DEBUG (fetchAndUpdateMarketData): Received data:", data);

    // US10Y Treasury
    if (data?.US10Y) {
      const y = parseFloat(data.US10Y.yield);
      const c = parseFloat(data.US10Y.change);
      console.log(`DEBUG (MarketData): US10Y - Yield: ${y}, Change: ${c}`);
      // Update value and apply color to the value element
      updateValueAndColor('us10yValue', y, c, true); // true for inverted colors (yields)
      // Update the separate change element for "Today" column
      updateChangeTextAndColor('us10yChange', c, true); // true for inverted colors (yields)
    } else {
      console.warn("DEBUG (MarketData): US10Y data is missing from getTopDashboardData.");
      updateTextElement('us10yValue', '--');
      updateTextElement('us10yChange', '--');
      // Ensure background color is reset if data is missing
      const parentHeaderItem = document.getElementById('us10yValue')?.closest('.header-item');
      if (parentHeaderItem) parentHeaderItem.classList.remove('positive-bg', 'negative-bg', 'neutral-bg');
    }

    // US30Y Treasury
    if (data?.US30Y) {
      const y = parseFloat(data.US30Y.yield);
      const c = parseFloat(data.US30Y.change);
      console.log(`DEBUG (MarketData): US30Y - Yield: ${y}, Change: ${c}`);
      // Update value and apply color to the value element
      updateValueAndColor('us30yValue', y, c, true); // true for inverted colors (yields)
      // Update the separate change element for "Today" column
      updateChangeTextAndColor('us30yChange', c, true); // true for inverted colors (yields)
    } else {
      console.warn("DEBUG (MarketData): US30Y data is missing from getTopDashboardData.");
      updateTextElement('us30yValue', '--');
      updateTextElement('us30yChange', '--');
      // Ensure background color is reset if data is missing
      const parentHeaderItem = document.getElementById('us30yValue')?.closest('.header-item');
      if (parentHeaderItem) parentHeaderItem.classList.remove('positive-bg', 'negative-bg', 'neutral-bg');
    }

    // UMBS 5.5
    if (data?.UMBS_5_5) {
      const v = parseFloat(data.UMBS_5_5.current);
      const c = parseFloat(data.UMBS_5_5.change); // This 'change' comes from Firestore `Daily_Change`
      updateTextElement('umbs55Value', isNaN(v) ? "--" : v.toFixed(3)); // Update value (no color on value for MBS)
      updateChangeTextAndColor('umbs55Change', c); // Apply color to change (not inverted)
    } else {
      updateTextElement('umbs55Value', '--');
      updateTextElement('umbs55Change', '--');
      const parentHeaderItem = document.getElementById('umbs55Value')?.closest('.header-item');
      if (parentHeaderItem) parentHeaderItem.classList.remove('positive-bg', 'negative-bg', 'neutral-bg');
    }

    // GNMA 5.5
    if (data?.GNMA_5_5) {
      const v = parseFloat(data.GNMA_5_5.current);
      const c = parseFloat(data.GNMA_5_5.change); // This 'change' comes from Firestore `Daily_Change`
      updateTextElement('gnma55Value', isNaN(v) ? "--" : v.toFixed(3)); // Update value (no color on value for MBS)
      updateChangeTextAndColor('gnma55Change', c); // Apply color to change (not inverted)
    } else {
      updateTextElement('gnma55Value', '--');
      updateTextElement('gnma55Change', '--');
      const parentHeaderItem = document.getElementById('gnma55Value')?.closest('.header-item');
      if (parentHeaderItem) parentHeaderItem.classList.remove('positive-bg', 'negative-bg', 'neutral-bg');
    }
  } catch (err) {
    console.error("Market data fetch error:", err);
    // Ensure all market snapshot elements are reset on error
    updateTextElement('us10yValue', '--');
    updateTextElement('us10yChange', '--');
    updateTextElement('us30yValue', '--');
    updateTextElement('us30yChange', '--');
    updateTextElement('umbs55Value', '--');
    updateTextElement('umbs55Change', '--');
    updateTextElement('gnma55Value', '--');
    updateTextElement('gnma55Change', '--');
    // Reset background colors on error
    document.querySelectorAll('.snapshot-grid .header-item').forEach(item => {
      item.classList.remove('positive-bg', 'negative-bg', 'neutral-bg');
    });
  }
}

// --- Daily Rates ---
/**
 * Fetches and updates daily mortgage rates data.
 */
async function fetchAndUpdateDailyRates() {
  console.log("Fetching daily rates...");
  try {
    const res = await fetch("/.netlify/functions/getDailyRatesData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    console.log("DEBUG (fetchAndUpdateDailyRates): Received data from Netlify function:", data);

    /**
     * Helper to update a single row in the Daily Mortgage Rates table.
     * @param {string} prefix - The ID prefix for the rate elements (e.g., 'fixed30y').
     * @param {object} rateData - The data object for the specific rate.
     */
    function updateRateRow(prefix, rateData) {
      console.log(`DEBUG (updateRateRow): Processing ${prefix}. rateData:`, rateData);

      if (!rateData) {
        console.warn(`DEBUG (updateRateRow): rateData is null/undefined for ${prefix}. Setting all to '--'.`);
        updateTextElement(`${prefix}Current`, '--');
        const currentElement = document.getElementById(`${prefix}Current`);
        if (currentElement) {
            currentElement.classList.remove('positive', 'negative'); // Remove text colors
            const parentRow = currentElement.closest('tr');
            if (parentRow) parentRow.classList.remove('positive-bg', 'negative-bg', 'neutral-bg'); // Remove row background colors
        }
        updateTextElement(`${prefix}YesterdayTable`, '--'); // For table-specific Yesterday ID
        updateTextElement(`${prefix}LastMonth`, '--');
        updateTextElement(`${prefix}YearAgo`, '--');
        updateTextElement(`${prefix}ChangeVs1M`, '--');
        updateTextElement(`${prefix}ChangeVs1Y`, '--');
        return;
      }

      // Update the 'Current' rate value and apply color based on daily_change (inverted)
      updateValueAndColor(`${prefix}Current`, rateData.latest, rateData.daily_change, true);

      // Update Yesterday, Last Month, Year Ago values
      // Check for specific table IDs for 'Yesterday' if different from general pattern
      if (prefix === "fixed30y") {
        updateTextElement("fixed30yYesterdayTable", formatPercentage(rateData.yesterday));
      } else if (prefix === "fixed15y") {
        updateTextElement("fixed15yYesterdayTable", formatPercentage(rateData.yesterday));
      } else { // Generic for other rates like VA, FHA, Jumbo, USDA
        updateTextElement(`${prefix}Yesterday`, formatPercentage(rateData.yesterday));
      }

      updateTextElement(`${prefix}LastMonth`, formatPercentage(rateData.last_month));
      updateTextElement(`${prefix}YearAgo`, formatPercentage(rateData.year_ago));

      // Calculate and update ChangeVs1M and ChangeVs1Y
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

    // --- Top snapshot (Rates section) ---
    // Fixed30Y
    if (data?.fixed30Y) {
        const latest30Y = parseFloat(data.fixed30Y.latest);
        const dailyChange30Y = parseFloat(data.fixed30Y.daily_change);
        const yesterday30Y = parseFloat(data.fixed30Y.yesterday);

        // Update value and apply color to the value element (fixed30yValue)
        updateValueAndColor("fixed30yValue", latest30Y, dailyChange30Y, true); // true for inverted colors
        // Update the separate change element for "Today" column
        updateChangeTextAndColor("fixed30yToday", dailyChange30Y, true); // true for inverted colors
        updateTextElement("fixed30yYesterday", formatPercentage(yesterday30Y));
    } else {
        console.warn("DEBUG (DailyRates): fixed30Y data is missing.");
        updateTextElement("fixed30yValue", "--");
        updateTextElement("fixed30yToday", "--");
        updateTextElement("fixed30yYesterday", "--");
        const parentHeaderItem = document.getElementById('fixed30yValue')?.closest('.header-item');
        if (parentHeaderItem) parentHeaderItem.classList.remove('positive-bg', 'negative-bg', 'neutral-bg');
    }

    // Fixed15Y
    if (data?.fixed15Y) {
        const latest15Y = parseFloat(data.fixed15Y.latest);
        const dailyChange15Y = parseFloat(data.fixed15Y.daily_change);
        const yesterday15Y = parseFloat(data.fixed15Y.yesterday);

        // Update value and apply color to the value element (fixed15yValue)
        updateValueAndColor("fixed15yValue", latest15Y, dailyChange15Y, true); // true for inverted colors
        // Update the separate change element for "Today" column
        updateChangeTextAndColor("fixed15yToday", dailyChange15Y, true); // true for inverted colors
        updateTextElement("fixed15yYesterday", formatPercentage(yesterday15Y));
    } else {
        console.warn("DEBUG (DailyRates): fixed15Y data is missing.");
        updateTextElement("fixed15yValue", "--");
        updateTextElement("fixed15yToday", "--");
        updateTextElement("fixed15yYesterday", "--");
        const parentHeaderItem = document.getElementById('fixed15yValue')?.closest('.header-item');
        if (parentHeaderItem) parentHeaderItem.classList.remove('positive-bg', 'negative-bg', 'neutral-bg');
    }

    // --- Table rows (Daily Mortgage Rates section) ---
    // Ensure correct casing for data keys as per Netlify function output
    updateRateRow("fixed30y", data.fixed30Y);
    updateRateRow("va30y", data.va30Y);
    updateRateRow("fha30y", data.fha30Y);
    updateRateRow("jumbo30y", data.jumbo30Y); // Confirmed casing with backend expectation
    updateRateRow("usda30y", data.usda30Y);   // Confirmed casing with backend expectation
    updateRateRow("fixed15y", data.fixed15Y); // Confirmed casing with backend expectation

  } catch (err) {
    console.error("Daily Rates fetch error:", err);
    // Reset all daily rates elements on error
    const ratePrefixes = ["fixed30y", "va30y", "fha30y", "jumbo30y", "usda30y", "fixed15y"];
    ratePrefixes.forEach(prefix => {
        updateTextElement(`${prefix}Current`, '--');
        updateTextElement(`${prefix}YesterdayTable`, '--');
        updateTextElement(`${prefix}LastMonth`, '--');
        updateTextElement(`${prefix}YearAgo`, '--');
        updateTextElement(`${prefix}ChangeVs1M`, '--');
        updateTextElement(`${prefix}ChangeVs1Y`, '--');
        // Also reset colors and background if elements exist
        const currentElement = document.getElementById(`${prefix}Current`);
        if (currentElement) {
            currentElement.classList.remove('positive', 'negative');
            const parentRow = currentElement.closest('tr');
            if (parentRow) parentRow.classList.remove('positive-bg', 'negative-bg', 'neutral-bg');
        }
    });
    // Reset top snapshot rates as well
    updateTextElement("fixed30yValue", "--");
    updateTextElement("fixed30yToday", "--");
    updateTextElement("fixed30yYesterday", "--");
    updateTextElement("fixed15yValue", "--");
    updateTextElement("fixed15yToday", "--");
    updateTextElement("fixed15yYesterday", "--");
    document.querySelectorAll('.snapshot-grid .header-item').forEach(item => {
      item.classList.remove('positive-bg', 'negative-bg', 'neutral-bg');
    });
  }
}

// --- Live Stocks ---
/**
 * Fetches and updates live stock data for SPY, QQQ, DIA.
 */
async function fetchAndUpdateLiveStockData() {
  console.log("Fetching live stock data...");
  try {
    const res = await fetch("/.netlify/functions/getLiveStockData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    console.log("DEBUG (fetchAndUpdateLiveStockData): Received data:", data);

    /**
     * Updates a stock's change percentage and applies color.
     * @param {string} id - The ID of the HTML element to update (e.g., 'spyChange').
     * @param {object} item - The stock data object.
     */
    function updateStockChange(id, item) {
      const el = document.getElementById(id);
      if (!el) {
        console.warn(`DEBUG (updateStockChange): Element with ID '${id}' NOT FOUND!`);
        return;
      }

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
      console.log(`DEBUG (updateStockChange): Updated '${id}' with '${formattedChange}'`);
    }

    updateStockChange('spyChange', data.SPY);
    updateStockChange('qqqChange', data.QQQ);
    updateStockChange('diaChange', data.DIA);
  } catch (err) {
    console.error("Stock data fetch error:", err);
    // Reset all stock elements on error
    updateTextElement('spyChange', '--');
    updateTextElement('qqqChange', '--');
    updateTextElement('diaChange', '--');
    document.getElementById('spyChange')?.classList.remove('positive', 'negative');
    document.getElementById('qqqChange')?.classList.remove('positive', 'negative');
    document.getElementById('diaChange')?.classList.remove('positive', 'negative');
  }
}

// --- Economic Indicators ---
/**
 * Fetches and updates economic indicators data.
 */
async function fetchAndUpdateEconomicIndicators() {
  console.log("Fetching economic indicators...");
  try {
    const res = await fetch("/.netlify/functions/getEconomicIndicatorsData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    console.log("DEBUG (fetchAndUpdateEconomicIndicators): Received data:", data);

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
      if (!d) {
        console.warn(`DEBUG (EconomicIndicators): Data for ${seriesId} is missing.`);
        updateTextElement(`${prefix}Latest`, '--');
        updateTextElement(`${prefix}Date`, '--');
        updateTextElement(`${prefix}LastMonth`, '--');
        updateTextElement(`${prefix}YearAgo`, '--');
        updateTextElement(`${prefix}NextRelease`, '--');
        updateTextElement(`${prefix}CoveragePeriod`, '--');
        return;
      }
      updateTextElement(`${prefix}Latest`, formatValue(d.latest));
      updateTextElement(`${prefix}Date`, formatDate(d.latest_date));
      updateTextElement(`${prefix}LastMonth`, formatValue(d.last_month));
      updateTextElement(`${prefix}YearAgo`, formatValue(d.year_ago));
      updateTextElement(`${prefix}NextRelease`, formatValue(d.next_release));
      updateTextElement(`${prefix}CoveragePeriod`, formatValue(d.coverage_period));
    });
  } catch (err) {
    console.error("Economic Indicators fetch error:", err);
    // Reset all economic indicators elements on error
    const rows = {
      HOUST: "houst", PERMIT1: "permit1", HOUST1F: "houst1f", RSXFS: "rsxfs",
      UMCSENT: "umcsent", CSUSHPINSA: "csushpinsa", PERMIT: "permit",
      T10YIE: "t10yie", T10Y2Y: "t10y2y"
    };
    Object.values(rows).forEach(prefix => {
      updateTextElement(`${prefix}Latest`, '--');
      updateTextElement(`${prefix}Date`, '--');
      updateTextElement(`${prefix}LastMonth`, '--');
      updateTextElement(`${prefix}YearAgo`, '--');
      updateTextElement(`${prefix}NextRelease`, '--');
      updateTextElement(`${prefix}CoveragePeriod`, '--');
    });
  }
}

// --- Bonds & Treasuries ---
/**
 * Fetches and updates bond and treasury data for the detailed table.
 */
async function fetchAndUpdateBondData() {
    console.log("Fetching bond and treasury data for table...");
    try {
        const res = await fetch("/.netlify/functions/getAllBondData");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        console.log("DEBUG (fetchAndUpdateBondData): Received data:", data);

        // Format the global last_updated timestamp
        let formattedGlobalTimestamp = '--';
        if (data.last_updated) {
            const timestamp = new Date(data.last_updated.replace(' ', 'T'));
            formattedGlobalTimestamp = timestamp.toLocaleString('en-US', {
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
            updateTextElement('bondLastUpdated', `Last Updated: ${formattedGlobalTimestamp}`);
        } else {
            updateTextElement('bondLastUpdated', `Last Updated: --`);
        }

        const bondInstruments = [
            "US10Y", "US30Y",
            "UMBS_5_5", "UMBS_6_0", "GNMA_5_5", "GNMA_6_0",
            "UMBS_5_5_Shadow", "UMBS_6_0_Shadow", // Ensure GNMA_6_0_Shadow is handled correctly
        ];

        bondInstruments.forEach(instrumentKey => {
            const instrumentData = data[instrumentKey];
            let baseId = instrumentKey.toLowerCase().replace(/_/g, '');

            // Special handling for GNMA_6_0_Shadow to match HTML ID 'gnma60shadowTable'
            if (instrumentKey === "GNMA_6_0_Shadow") {
                baseId = "gnma60shadow";
            }

            const tableIdPrefix = `${baseId}Table`;
            console.log(`DEBUG (BondData): Processing instrument: ${instrumentKey}, Base ID: ${baseId}, Table ID Prefix: ${tableIdPrefix}`);


            // Determine if the instrument is a Treasury (US10Y or US30Y) for inverted color logic
            const isInvertedColors = (instrumentKey === "US10Y" || instrumentKey === "US30Y");

            if (instrumentData) {
                console.log(`--- Data for ${instrumentKey} (Table) ---`);
                console.log(`Current: ${instrumentData.current}, Change: ${instrumentData.change}, Open: ${instrumentData.open}`);
                console.log(`High: ${instrumentData.high}, Low: ${instrumentData.low}, PrevClose: ${instrumentData.prevClose}`);
                console.log(`Last Updated (Instrument): ${instrumentData.last_updated}`);
                console.log(`--- End ${instrumentKey} Data ---`);

                updateTextElement(`${tableIdPrefix}Current`, formatValue(instrumentData.current));
                // Apply color to the change element
                updateChangeTextAndColor(`${tableIdPrefix}Change`, instrumentData.change, isInvertedColors);

                updateTextElement(`${tableIdPrefix}Open`, formatValue(instrumentData.open));
                updateTextElement(`${tableIdPrefix}High`, formatValue(instrumentData.high));
                updateTextElement(`${tableIdPrefix}Low`, formatValue(instrumentData.low));
                updateTextElement(`${tableIdPrefix}PrevClose`, formatValue(instrumentData.prevClose));

                // CRITICAL FIX: Use individual instrument's last_updated if available, otherwise global
                let instrumentUpdatedTime = formattedGlobalTimestamp;
                if (instrumentData.last_updated) {
                    try {
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
                    } catch (e) {
                        console.error(`Error formatting individual timestamp for ${instrumentKey}:`, e);
                        instrumentUpdatedTime = formattedGlobalTimestamp; // Fallback on error
                    }
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
            "UMBS_5_5_Shadow", "UMBS_6_0_Shadow"
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

  // Increased refresh rate for market and bond data as requested implicitly by urgency
  setInterval(fetchAndUpdateMarketData, 30000); // Every 30 seconds
  setInterval(fetchAndUpdateLiveStockData, 30000); // Every 30 seconds
  setInterval(fetchAndUpdateBondData, 30000); // Every 30 seconds
  // Economic indicators and daily rates typically don't change as frequently,
  // so keeping them at default or slightly longer intervals might be efficient.
  setInterval(fetchAndUpdateDailyRates, 60000); // Every 60 seconds
  setInterval(fetchAndUpdateEconomicIndicators, 300000); // Every 5 minutes
});
