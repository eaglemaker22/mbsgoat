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

// MODIFIED: Consolidated logic for updating value and change, and applying colors
// This function now handles both the main value and its corresponding change element.
function updateChangeIndicator(valueElementId, changeElementId, value, change, isInverted = false) {
  // Update the main value element (e.g., US10Y Yield, MBS Price)
  updateTextElement(valueElementId, formatValue(value));

  const changeElement = document.getElementById(changeElementId);
  const parentHeaderItem = changeElement ? changeElement.closest('.header-item') : null;

  if (changeElement) {
    let formattedChange = formatValue(change);
    const numericChange = parseFloat(change);

    // Determine positive/negative flags BEFORE applying classes
    let isPositiveChange = false;
    let isNegativeChange = false;
    if (!isNaN(numericChange)) {
      if (numericChange > 0) {
        formattedChange = `+${formattedChange}`; // Add '+' only if positive
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
    if (parentHeaderItem) {
      parentHeaderItem.classList.remove('positive-bg', 'negative-bg', 'neutral-bg'); // Reset all background classes
    }

    // Apply new color classes based on flags and isInverted
    if (isInverted) { // For Treasuries and Rates (higher yield/rate change is 'negative' for bond prices/borrowers)
      if (isPositiveChange) {
        changeElement.classList.add('negative'); // Red for positive change (higher yield/rate)
        if (parentHeaderItem) parentHeaderItem.classList.add('negative-bg');
      } else if (isNegativeChange) {
        changeElement.classList.add('positive'); // Green for negative change (lower yield/rate)
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
    console.log(`DEBUG (updateChangeIndicator): Updated change element '${changeElementId}' with value: '${formattedChange}'`);
  } else {
    console.warn(`DEBUG (updateChangeIndicator): Change element with ID '${changeElementId}' NOT FOUND!`);
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

    // --- DEBUGGING TREASURY VALUES ---
    console.log("DEBUG (MarketData): Raw data for US10Y:", data?.US10Y);
    console.log("DEBUG (MarketData): Raw data for US30Y:", data?.US30Y);
    // --- END DEBUGGING ---

    if (data?.US10Y) {
      const y = parseFloat(data.US10Y.yield);
      const c = parseFloat(data.US10Y.change);
      console.log(`DEBUG (MarketData): US10Y - Yield: ${y}, Change: ${c}`); // New debug log
      // Corrected: update us10yValue with yield, and us10yChange with actual change
      updateTextElement('us10yValue', isNaN(y) ? "--" : y.toFixed(3));
      updateChangeIndicator('us10yValue', 'us10yChange', // Pass us10yValue again for coloring its background
        isNaN(y) ? "--" : y.toFixed(3), // Use yield for value
        isNaN(c) ? "--" : c.toFixed(3), // Use change for coloring and displaying in us10yChange
        true // Invert colors for 10Y Treasury
      );
    } else {
      console.warn("DEBUG (MarketData): US10Y data is missing from getTopDashboardData.");
      updateTextElement('us10yValue', '--');
      updateTextElement('us10yChange', '--');
    }

    if (data?.US30Y) {
      const y = parseFloat(data.US30Y.yield);
      const c = parseFloat(data.US30Y.change);
      console.log(`DEBUG (MarketData): US30Y - Yield: ${y}, Change: ${c}`); // New debug log
      // Corrected: update us30yValue with yield, and us30yChange with actual change
      updateTextElement('us30yValue', isNaN(y) ? "--" : y.toFixed(3));
      updateChangeIndicator('us30yValue', 'us30yChange', // Pass us30yValue again for coloring its background
        isNaN(y) ? "--" : y.toFixed(3), // Use yield for value
        isNaN(c) ? "--" : c.toFixed(3), // Use change for coloring and displaying in us30yChange
        true // Invert colors for 30Y Treasury
      );
    } else {
      console.warn("DEBUG (MarketData): US30Y data is missing from getTopDashboardData.");
      updateTextElement('us30yValue', '--');
      updateTextElement('us30yChange', '--');
    }

    if (data?.UMBS_5_5) {
      const v = parseFloat(data.UMBS_5_5.current);
      const c = parseFloat(data.UMBS_5_5.change); // This 'change' comes from Firestore `Daily_Change`
      updateChangeIndicator('umbs55Value', 'umbs55Change',
        isNaN(v) ? "--" : v.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3)
      );
    } else {
      updateTextElement('umbs55Value', '--');
      updateTextElement('umbs55Change', '--');
    }

    if (data?.GNMA_5_5) {
      const v = parseFloat(data.GNMA_5_5.current);
      const c = parseFloat(data.GNMA_5_5.change); // This 'change' comes from Firestore `Daily_Change`
      updateChangeIndicator('gnma55Value', 'gnma55Change',
        isNaN(v) ? "--" : v.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3)
      );
    } else {
      updateTextElement('gnma55Value', '--');
      updateTextElement('gnma55Change', '--');
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
        // Ensure to remove colors if data is missing
        const currentElement = document.getElementById(`${prefix}Current`);
        if (currentElement) {
            currentElement.classList.remove('positive', 'negative');
        }
        updateTextElement(`${prefix}YesterdayTable`, '--'); // Assuming this ID exists for tables
        updateTextElement(`${prefix}LastMonth`, '--');
        updateTextElement(`${prefix}YearAgo`, '--');
        updateTextElement(`${prefix}ChangeVs1M`, '--');
        updateTextElement(`${prefix}ChangeVs1Y`, '--');
        // Removed DailyChange as per user request to not add a new column
        return;
      }

      // MODIFIED: Use updateChangeIndicator to color the 'Current' rate directly
      // valueElementId and changeElementId are the same here because we're coloring the 'Current' value
      // isInverted = true because higher rates are 'negative' (red), lower are 'positive' (green)
      updateChangeIndicator(`${prefix}Current`, `${prefix}Current`,
                            rateData.latest, rateData.daily_change, true); // true for inverted colors

      // updateTextElement(`${prefix}Current`, formatPercentage(rateData.latest)); // This line is now handled by updateChangeIndicator

      // The HTML IDs are already set up to match this pattern or specific table IDs
      // Ensure rateData.yesterday is correctly provided by the Netlify function
      if (prefix === "fixed30y") {
        updateTextElement("fixed30yYesterdayTable", formatPercentage(rateData.yesterday));
      } else if (prefix === "fixed15y") {
        updateTextElement("fixed15yYesterdayTable", formatPercentage(rateData.yesterday));
      } else { // Generic for other rates like VA, FHA, Jumbo, USDA
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

    // Top snapshot - MODIFIED TO FIX MISSING YESTERDAY DATA AND ENSURE COLORING
    // Fixed30Y
    if (data?.fixed30Y) {
        const latest30Y = parseFloat(data.fixed30Y.latest);
        const dailyChange30Y = parseFloat(data.fixed30Y.daily_change);
        const yesterday30Y = parseFloat(data.fixed30Y.yesterday); // Get yesterday's value
        
        updateTextElement("fixed30yValue", formatPercentage(latest30Y)); // Update value
        updateChangeIndicator("fixed30yValue", "fixed30yToday", // Use fixed30yToday for the change column
                              latest30Y, dailyChange30Y, true); // isInverted = true for rates
        updateTextElement("fixed30yYesterday", formatPercentage(yesterday30Y)); // Update Yesterday value
    } else {
        updateTextElement("fixed30yValue", "--");
        updateTextElement("fixed30yToday", "--"); // Ensure 'Today' is reset too
        updateTextElement("fixed30yYesterday", "--");
    }

    // Fixed15Y
    if (data?.fixed15Y) { // Note: using 'fixed15Y' as per your Netlify function output
        const latest15Y = parseFloat(data.fixed15Y.latest);
        const dailyChange15Y = parseFloat(data.fixed15Y.daily_change);
        const yesterday15Y = parseFloat(data.fixed15Y.yesterday); // Get yesterday's value

        updateTextElement("fixed15yValue", formatPercentage(latest15Y)); // Update value
        updateChangeIndicator("fixed15yValue", "fixed15yToday", // Use fixed15yToday for the change column
                              latest15Y, dailyChange15Y, true); // isInverted = true for rates
        updateTextElement("fixed15yYesterday", formatPercentage(yesterday15Y)); // Update Yesterday value
    } else {
        updateTextElement("fixed15yValue", "--");
        updateTextElement("fixed15yToday", "--"); // Ensure 'Today' is reset too
        updateTextElement("fixed15yYesterday", "--");
    }

    // Table rows
    updateRateRow("fixed30y", data.fixed30Y);
    updateRateRow("va30y", data.va30Y);
    updateRateRow("fha30y", data.fha30Y);
    updateRateRow("jumbo30y", data.jumbo30Y); // Ensure casing matches Netlify function output
    updateRateRow("usda30y", data.usda30Y);   // Ensure casing matches Netlify function output
    updateRateRow("fixed15y", data.fixed15Y); // Ensure casing matches Netlify function output

  } catch (err) {
    console.error("Daily Rates fetch error:", err);
  }
}

// --- Live Stocks --- (No changes needed for this specific issue)
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

// --- Economic Indicators --- (No changes needed for this specific issue)
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

// --- Bonds & Treasuries --- (No changes needed for this specific issue)
async function fetchAndUpdateBondData() {
    console.log("Fetching bond and treasury data for table...");
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

            // Determine if the instrument is a Treasury (US10Y or US30Y) for inverted color logic
            const isInvertedColors = (instrumentKey === "US10Y" || instrumentKey === "US30Y");

            if (instrumentData) {
                console.log(`--- Data for ${instrumentKey} ---`);
                console.log(`Current: ${instrumentData.current}, Change: ${instrumentData.change}, Open: ${instrumentData.open}`);
                console.log(`High: ${instrumentData.high}, Low: ${instrumentData.low}, PrevClose: ${instrumentData.prevClose}`);
                console.log(`--- End ${instrumentKey} Data ---`);

                updateTextElement(`${tableIdPrefix}Current`, formatValue(instrumentData.current)); // Update current value
                updateChangeIndicator(`${tableIdPrefix}Current`, `${tableIdPrefix}Change`, // Pass current value to updateChangeIndicator
                                      instrumentData.current, instrumentData.change, isInvertedColors);

                updateTextElement(`${tableIdPrefix}Open`, formatValue(instrumentData.open));
                updateTextElement(`${tableIdPrefix}High`, formatValue(instrumentData.high));
                updateTextElement(`${tableIdPrefix}Low`, formatValue(instrumentData.low));
                updateTextElement(`${tableIdPrefix}PrevClose`, formatValue(instrumentData.prevClose));

                // Use the global formattedTimestampForTable for each row's 'Updated' column
                updateTextElement(`${tableIdPrefix}Updated`, formattedTimestampForTable);

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
            "US10Y", "US30Y", // Include them in error handling as well
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

  setInterval(fetchAndUpdateMarketData, 30000); // Every 30 seconds
  setInterval(fetchAndUpdateLiveStockData, 30000);
  setInterval(fetchAndUpdateBondData, 30000); // Every 30 seconds
  setInterval(fetchAndUpdateDailyRates, 60000);
  setInterval(fetchAndUpdateEconomicIndicators, 300000);
});
