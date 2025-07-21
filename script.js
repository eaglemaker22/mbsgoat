// --- Helper Functions ---
function updateTextElement(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    // Check if the value is actually changing before applying highlight
    if (element.textContent !== String(value)) { // Convert value to string for comparison
      // Remove all highlight classes first to reset any animation
      element.classList.remove('highlight-on-update', 'border-flash-on-update');
      // Trigger reflow to restart the animation
      void element.offsetWidth; // This forces a reflow

      // Apply specific highlight based on element ID
      if (elementId.endsWith('TableUpdated')) {
        element.classList.add('border-flash-on-update'); // Apply border flash for 'Updated' column
      } else {
        element.classList.add('highlight-on-update'); // Apply background flash for other elements
      }
    }
    element.textContent = value;
    console.log(`DEBUG (updateTextElement): Updated element '${elementId}' with value: '${value}'`);
  } else {
    console.warn(`DEBUG (updateTextElement): Element with ID '${elementId}' NOT FOUND!`);
  }
}

// MODIFIED: Added isInverted parameter for color logic
function updateChangeIndicator(valueElementId, changeElementId, value, change, isInverted = false) {
  // Always update the main value element first, and trigger its highlight animation
  updateTextElement(valueElementId, formatValue(value));

  const changeElement = document.getElementById(changeElementId);
  const parentHeaderItem = changeElement ? changeElement.closest('.header-item') : null;

  if (changeElement) {
    let formattedChange;
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

    // Format the change string based on whether it's the value itself or a separate change indicator
    if (valueElementId === changeElementId) { // If we are coloring the value element directly (e.g., 'Current' rate)
        formattedChange = formatValue(value); // Use the original value, no '+' prefix for positive
    } else { // If it's a separate change indicator (e.g., 'Today' column)
        formattedChange = formatValue(change);
        if (isPositiveChange) {
            formattedChange = `+${formattedChange}`; // Add '+' for positive changes
        }
    }

    // Remove existing color classes to ensure correct application
    changeElement.classList.remove('positive', 'negative');
    if (parentHeaderItem) {
      parentHeaderItem.classList.remove('positive-bg', 'negative-bg', 'neutral-bg'); // Reset all background classes
    }

    // Apply colors based on isInverted flag
    if (isInverted) { // For Treasuries and Rates (where higher yield/rate is 'negative' for bond prices/borrowers)
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

    // Apply highlight to the change element itself, if its text content is different
    // This uses the generic updateTextElement logic, which will apply background highlight.
    if (changeElement.textContent !== formattedChange) {
      // updateTextElement will handle removing/adding highlight classes
      updateTextElement(changeElementId, formattedChange); // Call updateTextElement for the change element
    } else {
      changeElement.textContent = formattedChange; // Just update text if no change for highlight
    }
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
      const c = parseFloat(data.UMBS_5_5.change); // This 'change' comes from Firestore `Daily_Change`
      updateChangeIndicator('umbs55Value', 'umbs55Change',
        isNaN(v) ? "--" : v.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3)
      );
    }

    if (data?.GNMA_5_5) {
      const v = parseFloat(data.GNMA_5_5.current);
      const c = parseFloat(data.GNMA_5_5.change); // This 'change' comes from Firestore `Daily_Change`
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
        // These IDs are for the table, ensure they exist in HTML
        if (prefix === "fixed30y") {
            updateTextElement("fixed30yYesterdayTable", '--');
        } else if (prefix === "fixed15y") {
            updateTextElement("fixed15yYesterdayTable", '--');
        } else {
            updateTextElement(`${prefix}Yesterday`, '--');
        }
        updateTextElement(`${prefix}LastMonth`, '--');
        updateTextElement(`${prefix}YearAgo`, '--');
        updateTextElement(`${prefix}ChangeVs1M`, '--');
        updateTextElement(`${prefix}ChangeVs1Y`, '--');
        return;
      }

      // MODIFIED: Use updateChangeIndicator to color the 'Current' rate directly
      // valueElementId and changeElementId are the same here because we're coloring the 'Current' value
      // isInverted = true because higher rates are 'negative' (red), lower are 'positive' (green)
      updateChangeIndicator(`${prefix}Current`, `${prefix}Current`,
                            rateData.latest, rateData.daily_change, true); // true for inverted colors

      // The HTML IDs are already set up to match this pattern or specific table IDs
      // Ensure rateData.yesterday is correctly provided by the Netlify function
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
    }

    // Top snapshot - Ensure consistent casing for data access (using lowercase 'y' as per your working script)
    if (data?.fixed30Y) {
        const latest30Y = parseFloat(data.fixed30Y.latest);
        const dailyChange30Y = parseFloat(data.fixed30Y.daily_change);
        updateChangeIndicator("fixed30yValue", "fixed30yValue", // Apply color to the value itself
                              latest30Y, dailyChange30Y, true); // isInverted = true for rates
        updateTextElement("fixed30yYesterday", formatPercentage(data.fixed30Y.yesterday)); // Update Yesterday value
    } else {
        updateTextElement("fixed30yValue", "--");
        updateTextElement("fixed30yYesterday", "--");
    }

    if (data?.fixed15y) { // CORRECTED: Using lowercase 'y' for fixed15y
        const latest15Y = parseFloat(data.fixed15y.latest);
        const dailyChange15Y = parseFloat(data.fixed15y.daily_change);
        updateChangeIndicator("fixed15yValue", "fixed15yValue", // Apply color to the value itself
                              latest15Y, dailyChange15Y, true); // isInverted = true for rates
        updateTextElement("fixed15yYesterday", formatPercentage(data.fixed15y.yesterday)); // Update Yesterday value
    } else {
        updateTextElement("fixed15yValue", "--");
        updateTextElement("fixed15yYesterday", "--");
    }


    // Table rows - Ensure consistent casing for data access (using lowercase 'y' as per your working script)
    updateRateRow("fixed30y", data.fixed30Y);
    updateRateRow("va30y", data.va30Y);
    updateRateRow("fha30y", data.fha30Y);
    updateRateRow("jumbo30y", data.jumbo30y); // CORRECTED: Using lowercase 'y' for jumbo30y
    updateRateRow("usda30y", data.usda30y);   // CORRECTED: Using lowercase 'y' for usda30y
    updateRateRow("fixed15y", data.fixed15y); // CORRECTED: Using lowercase 'y' for fixed15y

    // DEBUG SECTION: Display Jumbo and 15Y Fixed Current at the bottom (using lowercase 'y' as per your working script)
    console.log("DEBUG (Daily Rates): Attempting to update DEBUG RATES section.");
    if (data?.jumbo30y?.latest) { // CORRECTED: Using lowercase 'y' for jumbo30y
      updateTextElement("debugJumbo30Y", formatPercentage(data.jumbo30y.latest));
      console.log(`DEBUG (Daily Rates): Updated debugJumbo30Y with: ${data.jumbo30y.latest}`);
    } else {
      console.warn("DEBUG (Daily Rates): data.jumbo30y.latest is not available for debug section.");
    }
    if (data?.fixed15y?.latest) { // CORRECTED: Using lowercase 'y' for fixed15y
      updateTextElement("debugFixed15Y", formatPercentage(data.fixed15y.latest));
      console.log(`DEBUG (Daily Rates): Updated debugFixed15Y with: ${data.fixed15y.latest}`);
    } else {
      console.warn("DEBUG (Daily Rates): data.fixed15y.latest is not available for debug section.");
    }

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
      // Ensure highlight-on-update is removed here too for proper re-triggering
      el.classList.remove('positive', 'negative', 'highlight-on-update');

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

      // Apply highlight only if the content is actually changing
      if (el.textContent !== formattedChange) {
        // updateTextElement will handle removing/adding highlight classes
        updateTextElement(id, formattedChange); // Use updateTextElement to ensure highlight
      } else {
        el.textContent = formattedChange; // Just update text if no change for highlight
      }
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
      console.log(`DEBUG (Economic Indicators): Processing ${seriesId}. Data:`, d);
      if (!d) {
        console.warn(`DEBUG (Economic Indicators): Data is null/undefined for ${seriesId}. Skipping row update.`);
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
  }
}

// --- Bonds & Treasuries ---
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
                timeZone: 'America/Los_Angeles', // Assuming this timezone is desired
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
                console.log(`--- Data for ${instrumentKey} ---`);
                console.log(`Current: ${instrumentData.current}, Change: ${instrumentData.change}, Open: ${instrumentData.open}`);
                console.log(`High: ${instrumentData.high}, Low: ${instrumentData.low}, PrevClose: ${instrumentData.prevClose}`);
                console.log(`--- End ${instrumentKey} Data ---`);

                updateChangeIndicator(`${tableIdPrefix}Current`, `${tableIdPrefix}Change`,
                                      instrumentData.current, instrumentData.change, isInvertedColors);

                updateTextElement(`${tableIdPrefix}Open`, formatValue(instrumentData.open));
                updateTextElement(`${tableIdPrefix}High`, formatValue(instrumentData.high));
                updateTextElement(`${tableIdPrefix}Low`, formatValue(instrumentData.low));
                updateTextElement(`${tableIdPrefix}PrevClose`, formatValue(instrumentData.prevClose));

                // NEW: Use the instrument-specific last_updated for the 'Updated' column
                // This was previously using a general timestamp, now it will use the specific one if available
                let instrumentSpecificTimestamp = '--';
                if (instrumentData.last_updated) {
                    const timestamp = new Date(instrumentData.last_updated.replace(' ', 'T'));
                    instrumentSpecificTimestamp = timestamp.toLocaleString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                        timeZone: 'America/Los_Angeles', // Assuming this timezone is desired
                        timeZoneName: 'short'
                    });
                }
                updateTextElement(`${tableIdPrefix}Updated`, instrumentSpecificTimestamp);

            } else {
                console.warn(`Data for ${instrumentKey} not found in bond data. Setting defaults.`);
                updateTextElement(`${tableIdPrefix}Current`, '--');
                updateTextElement(`${tableIdPrefix}Change`, '--');
                updateTextElement(`${tableIdPrefix}Open`, '--');
                updateTextElement(`${tableIdPrefix}High`, '--');
                updateTextElement(`${tableIdPrefix}Low`, '--');
                updateTextElement(`${tableIdPrefix}PrevClose`, '--');
                updateTextElement(`${tableIdPrefix}Updated`, '--'); // Ensure it's still '--' on error
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

  setInterval(fetchAndUpdateMarketData, 60000);
  setInterval(fetchAndUpdateLiveStockData, 30000);
  setInterval(fetchAndUpdateBondData, 60000);
});
