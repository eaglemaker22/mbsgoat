// --- Helper Functions ---
function updateTextElement(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  } else {
    // console.warn(`Element with ID '${elementId}' not found.`);
  }
}

// MODIFIED: Added isInverted parameter for color logic
function updateChangeIndicator(valueElementId, changeElementId, value, change, isInverted = false) {
  updateTextElement(valueElementId, formatValue(value));

  const changeElement = document.getElementById(changeElementId);
  const parentHeaderItem = changeElement ? changeElement.closest('.header-item') : null;

  if (changeElement) {
    let formattedChange = formatValue(change);
    changeElement.classList.remove('positive', 'negative');
    if (parentHeaderItem) {
      parentHeaderItem.classList.remove('positive-bg', 'negative-bg', 'neutral-bg');
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
    if (isInverted) { // For Treasuries
      if (isPositiveChange) {
        changeElement.classList.add('negative'); // Red for positive change
        if (parentHeaderItem) parentHeaderItem.classList.add('negative-bg');
      } else if (isNegativeChange) {
        changeElement.classList.add('positive'); // Green for negative change
        if (parentHeaderItem) parentHeaderItem.classList.add('positive-bg');
      } else {
        if (parentHeaderItem) parentHeaderItem.classList.add('neutral-bg');
      }
    } else { // For MBS/Equities (default behavior)
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

// --- Market Data --- (UPDATED for Treasury color inversion)
async function fetchAndUpdateMarketData() {
  console.log("Fetching market data...");
  try {
    const res = await fetch("/.netlify/functions/getTopDashboardData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    if (data?.US10Y) {
      const y = parseFloat(data.US10Y.yield);
      const c = parseFloat(data.US10Y.change);
      // Pass true for isInverted for Treasuries
      updateChangeIndicator('us10yValue', 'us10yChange',
        isNaN(y) ? "--" : y.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3),
        true // Invert colors for 10Y Treasury
      );
    }

    if (data?.US30Y) {
      const y = parseFloat(data.US30Y.yield);
      const c = parseFloat(data.US30Y.change);
      // Pass true for isInverted for Treasuries
      updateChangeIndicator('us30yValue', 'us30yChange',
        isNaN(y) ? "--" : y.toFixed(3),
        isNaN(c) ? "--" : c.toFixed(3),
        true // Invert colors for 30Y Treasury
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

// --- Daily Rates --- (UPDATED for 15Y Fixed Yesterday)
async function fetchAndUpdateDailyRates() {
  console.log("Fetching daily rates...");
  try {
    const res = await fetch("/.netlify/functions/getDailyRatesData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    function updateRateRow(prefix, rateData) {
      if (!rateData) return;

      updateTextElement(`${prefix}Current`, formatPercentage(rateData.latest));

      // Specific handling for fixed30y and fixed15y for 'Yesterday'
      if (prefix === "fixed30y") {
        updateTextElement("fixed30yYesterdayTable", formatPercentage(rateData.yesterday));
      } else if (prefix === "fixed15y") { // <-- RE-ADDED THIS SPECIFIC CHECK
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

    // Top snapshot
    updateTextElement("fixed30yValue", formatPercentage(data?.fixed30Y?.latest));
    updateTextElement("fixed30yYesterday", formatPercentage(data?.fixed30Y?.yesterday));
    updateTextElement("fixed15yValue", formatPercentage(data?.fixed15Y?.latest));
    updateTextElement("fixed15yYesterday", formatPercentage(data?.fixed15Y?.yesterday));

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

// --- Live Stocks --- (No changes)
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

// --- Economic Indicators --- (No changes)
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

// --- Bonds & Treasuries (UPDATED for 'Updated' column time format, debugging, and US10Y/US30Y) ---
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
                timeZone: 'America/Los_Angeles',
                timeZoneName: 'short'
            });
            updateTextElement('bondLastUpdated', `Last Updated: ${formattedTimestampForTable}`);
        } else {
            updateTextElement('bondLastUpdated', `Last Updated: --`);
        }

        // MODIFIED: Added US10Y and US30Y to this list
        const bondInstruments = [
            "US10Y", // New: Add US10Y
            "US30Y", // New: Add US30Y
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
                // Debugging logs: Check what data is actually received for each field
                console.log(`--- Data for ${instrumentKey} ---`);
                console.log(`Current: ${instrumentData.current}, Change: ${instrumentData.change}, Open: ${instrumentData.open}`);
                console.log(`High: ${instrumentData.high}, Low: ${instrumentData.low}, PrevClose: ${instrumentData.prevClose}`);
                console.log(`--- End ${instrumentKey} Data ---`);

                // Pass isInvertedColors flag to updateChangeIndicator
                updateChangeIndicator(`${tableIdPrefix}Current`, `${tableIdPrefix}Change`,
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

  setInterval(fetchAndUpdateMarketData, 60000);
  setInterval(fetchAndUpdateLiveStockData, 30000);
  setInterval(fetchAndUpdateBondData, 60000);
});
