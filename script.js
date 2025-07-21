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

// Helper function for formatting dates and times from "YYYY-MM-DD HH:MM:SS"
function formatTimestamp(timestampString) {
  console.log(`DEBUG (formatTimestamp): Received timestamp: '${timestampString}'`);
  if (!timestampString || timestampString === "N/A" || timestampString === "--") {
    return "--";
  }
  try {
    // Replace space with 'T' for proper ISO 8601 parsing by Date object
    const date = new Date(timestampString.replace(' ', 'T'));
    if (isNaN(date.getTime())) {
      console.warn(`DEBUG (formatTimestamp): Invalid date string received: '${timestampString}'.`);
      return "--";
    }
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const formattedTime = `${hours}:${minutes}:${seconds}`;
    console.log(`DEBUG (formatTimestamp): Formatted timestamp: '${formattedTime}'`);
    return formattedTime;
  } catch (e) {
    console.error("Error formatting timestamp:", e, timestampString);
    return "--";
  }
}

// Helper function for formatting dates (YYYY-MM-DD to MM/DD/YYYY)
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

    console.log("DEBUG (MarketData): Raw data from getTopDashboardData:", data);

    if (data?.US10Y) {
      const y = parseFloat(data.US10Y.yield);
      const c = parseFloat(data.US10Y.change);
      console.log(`DEBUG (MarketData): US10Y - Yield: ${y}, Change: ${c}`);
      updateTextElement('us10yValue', isNaN(y) ? "--" : y.toFixed(3));
      updateChangeIndicator('us10yValue', 'us10yChange',
        isNaN(y) ? "--" : y.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3),
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
      console.log(`DEBUG (MarketData): US30Y - Yield: ${y}, Change: ${c}`);
      updateTextElement('us30yValue', isNaN(y) ? "--" : y.toFixed(3));
      updateChangeIndicator('us30yValue', 'us30yChange',
        isNaN(y) ? "--" : y.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3),
        true // Invert colors for 30Y Treasury
      );
    } else {
      console.warn("DEBUG (MarketData): US30Y data is missing from getTopDashboardData.");
      updateTextElement('us30yValue', '--');
      updateTextElement('us30yChange', '--');
    }

    // UMBS 5.5 in snapshot
    if (data?.UMBS_5_5) {
      const v = parseFloat(data.UMBS_5_5.current);
      const c = parseFloat(data.UMBS_5_5.change);
      updateChangeIndicator('umbs55Value', 'umbs55Change',
        isNaN(v) ? "--" : v.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3)
      );
    } else {
      updateTextElement('umbs55Value', '--');
      updateTextElement('umbs55Change', '--');
    }

    // GNMA 5.5 in snapshot
    if (data?.GNMA_5_5) {
      const v = parseFloat(data.GNMA_5_5.current);
      const c = parseFloat(data.GNMA_5_5.change);
      updateChangeIndicator('gnma55Value', 'gnma55Change',
        isNaN(v) ? "--" : v.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3)
      );
    } else {
      updateTextElement('gnma55Value', '--');
      updateTextElement('gnma55Change', '--');
    }

    // Fixed 30Y in snapshot
    if (data?.fixed30Y) {
        const latest30Y = parseFloat(data.fixed30Y.latest);
        const dailyChange30Y = parseFloat(data.fixed30Y.daily_change);
        const yesterday30Y = parseFloat(data.fixed30Y.yesterday);
        
        updateTextElement("fixed30yValue", formatPercentage(latest30Y));
        updateChangeIndicator("fixed30yValue", "fixed30yToday",
                              latest30Y, dailyChange30Y, true);
        updateTextElement("fixed30yYesterday", formatPercentage(yesterday30Y));
    } else {
        updateTextElement("fixed30yValue", "--");
        updateTextElement("fixed30yToday", "--");
        updateTextElement("fixed30yYesterday", "--");
    }

    // Fixed 15Y in snapshot
    if (data?.fixed15Y) {
        const latest15Y = parseFloat(data.fixed15Y.latest);
        const dailyChange15Y = parseFloat(data.fixed15Y.daily_change);
        const yesterday15Y = parseFloat(data.fixed15Y.yesterday);

        updateTextElement("fixed15yValue", formatPercentage(latest15Y));
        updateChangeIndicator("fixed15yValue", "fixed15yToday",
                              latest15Y, dailyChange15Y, true);
        updateTextElement("fixed15yYesterday", formatPercentage(yesterday15Y));
    } else {
        updateTextElement("fixed15yValue", "--");
        updateTextElement("fixed15yToday", "--");
        updateTextElement("fixed15yYesterday", "--");
    }

    // Stock data in snapshot
    if (data?.DIA) {
      updateTextElement('diaChange', formatPercentage(data.DIA.percentChange));
    } else {
      updateTextElement('diaChange', '--');
    }
    if (data?.SPY) {
      updateTextElement('spyChange', formatPercentage(data.SPY.percentChange));
    } else {
      updateTextElement('spyChange', '--');
    }
    if (data?.QQQ) {
      updateTextElement('qqqChange', formatPercentage(data.QQQ.percentChange));
    } else {
      updateTextElement('qqqChange', '--');
    }

    // Update marketLastUpdated (if it exists in your HTML, which it does in the provided index.html)
    if (data.last_updated) {
        const timestamp = new Date(data.last_updated.replace(' ', 'T'));
        const formattedTime = timestamp.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'America/Los_Angeles' // Or your desired timezone
        });
        updateTextElement('marketLastUpdated', `Last Updated: ${formattedTime}`);
    } else {
        updateTextElement('marketLastUpdated', `Last Updated: --`);
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
    updateTextElement('fixed30yValue', '--');
    updateTextElement('fixed30yToday', '--');
    updateTextElement('fixed30yYesterday', '--');
    updateTextElement('fixed15yValue', '--');
    updateTextElement('fixed15yToday', '--');
    updateTextElement('fixed15yYesterday', '--');
    updateTextElement('diaChange', '--');
    updateTextElement('spyChange', '--');
    updateTextElement('qqqChange', '--');
    updateTextElement('marketLastUpdated', `Last Updated: Error`);
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

    // Update the overall last updated timestamp for the Daily Rates section
    if (data.last_updated) {
        const timestamp = new Date(data.last_updated.replace(' ', 'T'));
        const formattedTime = timestamp.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'America/Los_Angeles' // Or your desired timezone
        });
        updateTextElement('dailyRatesLastUpdated', `Last Updated: ${formattedTime}`);
    } else {
        updateTextElement('dailyRatesLastUpdated', `Last Updated: --`);
    }


    function updateRateRow(prefix, rateData) {
      console.log(`DEBUG (updateRateRow): Processing ${prefix}. rateData:`, rateData);

      if (!rateData) {
        console.warn(`DEBUG (updateRateRow): rateData is null/undefined for ${prefix}. Setting all to '--'.`);
        updateTextElement(`${prefix}Current`, '--');
        const currentElement = document.getElementById(`${prefix}Current`);
        if (currentElement) {
            currentElement.classList.remove('positive', 'negative');
        }
        // Ensure to reset all relevant fields for the row
        updateTextElement(`${prefix}YesterdayTable`, '--');
        updateTextElement(`${prefix}LastMonth`, '--');
        updateTextElement(`${prefix}YearAgo`, '--');
        updateTextElement(`${prefix}Open`, '--'); // Added these for consistency with bond table
        updateTextElement(`${prefix}High`, '--'); // Added these for consistency with bond table
        updateTextElement(`${prefix}Low`, '--');  // Added these for consistency with bond table
        updateTextElement(`${prefix}PrevClose`, '--'); // Added these for consistency with bond table
        updateTextElement(`${prefix}Updated`, '--'); // Added for consistency
        return;
      }

      // Update current value and apply color based on daily_change
      updateChangeIndicator(`${prefix}Current`, `${prefix}Current`,
                            rateData.latest, rateData.daily_change, true); // true for inverted colors

      // Update other fields in the table row
      // Note: your HTML for daily rates table does not have 'Change', 'Open', 'High', 'Low', 'Prev Close'
      // It has 'Current', 'Yesterday', 'Last Month', '1 Year Ago'
      // So, we'll update based on the HTML structure you provided.
      
      // The 'Yesterday' column in HTML uses different IDs for fixed30y/fixed15y vs others
      if (prefix === "fixed30y") {
        updateTextElement("fixed30yYesterdayTable", formatPercentage(rateData.yesterday));
      } else if (prefix === "fixed15y") {
        updateTextElement("fixed15yYesterdayTable", formatPercentage(rateData.yesterday));
      } else {
        updateTextElement(`${prefix}Yesterday`, formatPercentage(rateData.yesterday));
      }

      updateTextElement(`${prefix}LastMonth`, formatPercentage(rateData.last_month));
      updateTextElement(`${prefix}YearAgo`, formatPercentage(rateData.year_ago));

      // If you want to display a specific "Updated" timestamp for each daily rate,
      // you'd need a last_updated field for each rate in your API response.
      // For now, we'll use the overall dailyRatesLastUpdated timestamp if available.
      // Or, if the API provides individual timestamps, we'd use rateData.last_updated here.
      // Assuming a single last_updated for the whole daily rates section from the API for now.
      const individualRateTimestamp = rateData.last_updated ? formatTimestamp(rateData.last_updated) : '--';
      updateTextElement(`${prefix}Updated`, individualRateTimestamp); // This ID is not in your current HTML for daily rates table.
                                                                    // If you want it, you'll need to add a column.
    }

    // Table rows
    updateRateRow("fixed30y", data.fixed30Y);
    updateRateRow("va30y", data.va30Y);
    updateRateRow("fha30y", data.fha30Y);
    updateRateRow("jumbo30y", data.jumbo30Y);
    updateRateRow("usda30y", data.usda30Y);
    updateRateRow("fixed15y", data.fixed15Y);

  } catch (err) {
    console.error("Daily Rates fetch error:", err);
    updateTextElement('dailyRatesLastUpdated', `Last Updated: Error`);
    // Reset all daily rate table rows on error
    const rateInstruments = ["fixed30y", "va30y", "fha30y", "jumbo30y", "usda30y", "fixed15y"];
    rateInstruments.forEach(prefix => {
        updateTextElement(`${prefix}Current`, '--');
        updateTextElement(`${prefix}YesterdayTable`, '--');
        updateTextElement(`${prefix}Yesterday`, '--'); // For non-fixed rates
        updateTextElement(`${prefix}LastMonth`, '--');
        updateTextElement(`${prefix}YearAgo`, '--');
        updateTextElement(`${prefix}Open`, '--');
        updateTextElement(`${prefix}High`, '--');
        updateTextElement(`${prefix}Low`, '--');
        updateTextElement(`${prefix}PrevClose`, '--');
        updateTextElement(`${prefix}Updated`, '--');
    });
  }
}

// --- Live Stocks ---
async function fetchAndUpdateLiveStockData() {
  console.log("Fetching live stock data...");
  try {
    const res = await fetch("/.netlify/functions/getLiveStockData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    console.log("DEBUG (fetchAndUpdateLiveStockData): Received data from Netlify function:", data);

    // Update the overall last updated timestamp for the Live Stock Data section
    if (data.last_updated) {
        const timestamp = new Date(data.last_updated.replace(' ', 'T'));
        const formattedTime = timestamp.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'America/Los_Angeles' // Or your desired timezone
        });
        updateTextElement('liveStockLastUpdated', `Last Updated: ${formattedTime}`);
    } else {
        updateTextElement('liveStockLastUpdated', `Last Updated: --`);
    }

    function updateStockRow(prefix, stockData) {
        console.log(`DEBUG (updateStockRow): Processing ${prefix}. stockData:`, stockData);
        if (!stockData) {
            console.warn(`DEBUG (updateStockRow): stockData is null/undefined for ${prefix}. Setting all to '--'.`);
            updateTextElement(`${prefix}Current`, '--');
            updateTextElement(`${prefix}Change`, '--');
            updateTextElement(`${prefix}Open`, '--');
            updateTextElement(`${prefix}High`, '--');
            updateTextElement(`${prefix}Low`, '--');
            updateTextElement(`${prefix}PrevClose`, '--');
            updateTextElement(`${prefix}Updated`, '--');
            return;
        }

        updateTextElement(`${prefix}Current`, formatValue(stockData.current));
        // For change, we'll use a simple updateTextElement as stock change is usually just a number/percentage
        // If you need color coding for stock change, you'd integrate updateChangeIndicator here.
        let formattedChange = '--';
        if (stockData.percentChange !== undefined) {
            const n = parseFloat(stockData.percentChange);
            if (!isNaN(n)) {
                const t = n.toFixed(2);
                if (n > 0) {
                    formattedChange = `+${t}%`;
                } else if (n < 0) {
                    formattedChange = `${t}%`;
                } else {
                    formattedChange = '0.00%';
                }
            }
        }
        updateTextElement(`${prefix}Change`, formattedChange);
        // Apply color class for stock change directly
        const changeElement = document.getElementById(`${prefix}Change`);
        if (changeElement) {
            changeElement.classList.remove('positive', 'negative');
            const numericChange = parseFloat(stockData.percentChange);
            if (!isNaN(numericChange)) {
                if (numericChange > 0) {
                    changeElement.classList.add('positive');
                } else if (numericChange < 0) {
                    changeElement.classList.add('negative');
                }
            }
        }


        updateTextElement(`${prefix}Open`, formatValue(stockData.open));
        updateTextElement(`${prefix}High`, formatValue(stockData.high));
        updateTextElement(`${prefix}Low`, formatValue(stockData.low));
        updateTextElement(`${prefix}PrevClose`, formatValue(stockData.prevClose));
        
        // Use individual last_updated for each stock if available, otherwise use general
        const individualStockTimestamp = stockData.last_updated ? formatTimestamp(stockData.last_updated) : '--';
        updateTextElement(`${prefix}Updated`, individualStockTimestamp);
    }

    updateStockRow("dow", data.DIA); // Assuming DIA maps to DOW in your HTML
    updateStockRow("sp500", data.SPY); // Assuming SPY maps to S&P 500 in your HTML
    updateStockRow("nasdaq", data.QQQ); // Assuming QQQ maps to NASDAQ in your HTML

  } catch (err) {
    console.error("Stock data fetch error:", err);
    updateTextElement('liveStockLastUpdated', `Last Updated: Error`);
    // Reset all stock table rows on error
    const stockTickers = ["dow", "sp500", "nasdaq"]; // Use the prefixes used in HTML
    stockTickers.forEach(prefix => {
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


// --- Economic Indicators ---
async function fetchAndUpdateEconomicIndicators() {
  console.log("Fetching economic indicators...");
  try {
    const res = await fetch("/.netlify/functions/getEconomicIndicatorsData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    console.log("DEBUG (fetchAndUpdateEconomicIndicators): Received data from Netlify function:", data);

    // Update the overall last updated timestamp for the Economic Indicators section
    if (data.last_updated) {
        const timestamp = new Date(data.last_updated.replace(' ', 'T'));
        const formattedTime = timestamp.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'America/Los_Angeles' // Or your desired timezone
        });
        updateTextElement('economicIndicatorsLastUpdated', `Last Updated: ${formattedTime}`);
    } else {
        updateTextElement('economicIndicatorsLastUpdated', `Last Updated: --`);
    }

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
        console.warn(`Data for economic indicator ${seriesId} not found. Setting defaults.`);
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
    updateTextElement('economicIndicatorsLastUpdated', `Last Updated: Error`);
    // Reset all economic indicator rows on error
    const economicIndicators = [
        "houst", "permit1", "houst1f", "rsxfs", "umcsent",
        "csushpinsa", "permit", "t10yie", "t10y2y"
    ];
    economicIndicators.forEach(prefix => {
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
async function fetchAndUpdateBondData() {
    console.log("Fetching bond and treasury data for table...");
    try {
        const res = await fetch("/.netlify/functions/getAllBondData");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        console.log("DEBUG (fetchAndUpdateBondData): FULL BOND DATA RECEIVED:", data); // Log the full data

        // Update the overall last updated timestamp for the Bonds & Treasuries section
        // Note: Your API sample doesn't show a root-level 'last_updated' for bond data.
        // If you want an overall timestamp for this section, your API needs to provide it.
        // For now, setting to '--' if not present at root.
        if (data.last_updated) {
            const timestamp = new Date(data.last_updated.replace(' ', 'T'));
            const formattedTime = timestamp.toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
                timeZone: 'America/Los_Angeles' // Ensure this matches your data's timezone or desired display timezone
            });
            updateTextElement('bondLastUpdated', `Last Updated: ${formattedTime}`);
        } else {
            // If no root last_updated, you might want to show the latest of all individual bonds,
            // or simply leave it as '--' if no overall timestamp is intended.
            updateTextElement('bondLastUpdated', `Last Updated: --`);
        }

        const bondInstruments = [
            "US10Y", "US30Y",
            "UMBS_5_5", "UMBS_6_0", "GNMA_5_5", "GNMA_6_0",
            "UMBS_5_5_Shadow", "UMBS_6_0_Shadow", "GNMA_5_5_Shadow", "GNMA_6_0_Shadow"
        ];

        bondInstruments.forEach(instrumentKey => {
            const instrumentData = data[instrumentKey];
            // Correctly handle GNMA_6_0_Shadow for baseId as it was causing issues before
            let baseId = instrumentKey.toLowerCase().replace(/_/g, '');
            if (instrumentKey === "GNMA_6_0_Shadow") {
                baseId = "gnma60shadow"; // Ensure this matches your HTML ID exactly
            }
            const tableIdPrefix = `${baseId}Table`;

            // Determine if the instrument is a Treasury (US10Y or US30Y) for inverted color logic
            const isInvertedColors = (instrumentKey === "US10Y" || instrumentKey === "US30Y");

            if (instrumentData) {
                console.log(`DEBUG (fetchAndUpdateBondData): Processing instrument: '${instrumentKey}', baseId: '${baseId}'`);
                console.log(`DEBUG (fetchAndUpdateBondData): instrumentData for '${instrumentKey}':`, instrumentData);

                updateTextElement(`${tableIdPrefix}Current`, formatValue(instrumentData.current));
                updateChangeIndicator(`${tableIdPrefix}Current`, `${tableIdPrefix}Change`,
                                      instrumentData.current, instrumentData.change, isInvertedColors);

                updateTextElement(`${tableIdPrefix}Open`, formatValue(instrumentData.open));
                updateTextElement(`${tableIdPrefix}High`, formatValue(instrumentData.high));
                updateTextElement(`${tableIdPrefix}Low`, formatValue(instrumentData.low));
                updateTextElement(`${tableIdPrefix}PrevClose`, formatValue(instrumentData.prevClose));

                // *** CRITICAL FIX: Get last_updated from the individual instrumentData object ***
                const bondTimestamp = instrumentData.last_updated;
                const formattedBondTimestamp = formatTimestamp(bondTimestamp);
                console.log(`DEBUG (fetchAndUpdateBondData): Timestamp for ${instrumentKey} (${tableIdPrefix}Updated): '${bondTimestamp}' -> Formatted: '${formattedBondTimestamp}'`);
                updateTextElement(`${tableIdPrefix}Updated`, formattedBondTimestamp);

            } else {
                console.warn(`DEBUG (fetchAndUpdateBondData): Data for ${instrumentKey} not found in bond data. Setting defaults.`);
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
