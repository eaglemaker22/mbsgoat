// --- Helper Functions to Update DOM Elements ---

/**
 * Updates a single text element by its ID.
 * @param {string} elementId - The ID of the HTML element.
 * @param {string} value - The new text content for the element.
 */
function updateTextElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    } else {
        console.warn(`Element with ID '${elementId}' not found.`);
    }
}

/**
 * Updates a change indicator (value and color) for header items.
 * Assumes the HTML structure has a span for value and a span for change,
 * where change is a number string like "+0.123" or "-0.45".
 * @param {string} valueElementId - ID for the main value span (e.g., 'ums55Value').
 * @param {string} changeElementId - ID for the change span (e.g., 'ums55Change').
 * @param {string|number} value - The main value (e.g., "4.425" or 4.425).
 * @param {string|number} change - The change value (e.g., "-0.212" or -0.212).
 */
function updateChangeIndicator(valueElementId, changeElementId, value, change) {
    updateTextElement(valueElementId, formatValue(value)); // Update the main value

    const changeElement = document.getElementById(changeElementId);
    const parentHeaderItem = changeElement ? changeElement.closest('.header-item') : null; // Get the parent header-item for background

    if (changeElement) {
        let formattedChange = formatValue(change);

        // Remove existing color classes for text
        changeElement.classList.remove('positive', 'negative');
        // Remove existing background classes for parent
        if (parentHeaderItem) {
            parentHeaderItem.classList.remove('positive-bg', 'negative-bg', 'neutral-bg');
        }

        // Determine sign and apply class
        let isPositive = false;
        let isNegative = false;

        if (typeof change === 'number') {
            if (change > 0) {
                formattedChange = `+${formattedChange}`;
                isPositive = true;
            } else if (change < 0) {
                isNegative = true;
            }
        } else if (typeof change === 'string') {
            // Check if it's a valid number string that might contain +/-
            const numericChange = parseFloat(change);
            if (!isNaN(numericChange)) {
                if (numericChange > 0) {
                    formattedChange = `+${formattedChange}`;
                    isPositive = true;
                } else if (numericChange < 0) {
                    isNegative = true;
                }
            }
            // If it's a string like '--', it won't be positive/negative
        }

        if (isPositive) {
            changeElement.classList.add('positive');
            if (parentHeaderItem) parentHeaderItem.classList.add('positive-bg');
        } else if (isNegative) {
            changeElement.classList.add('negative');
            if (parentHeaderItem) parentHeaderItem.classList.add('negative-bg');
        } else {
            // For zero change or '--'
            if (parentHeaderItem) parentHeaderItem.classList.add('neutral-bg');
        }

        changeElement.textContent = formattedChange; // Set text content
    }
}


/**
 * Updates a specific row in the bond ticker table by its ID.
 * @param {string} rowId - The ID of the <tr> element (e.g., 'shadow55Row').
 * @param {Object} rowData - An object containing the data for the row's cells.
 * Expected keys: change, actual, open, priorDayClose, high, low, updated.
 */
function updateBondTableRow(rowId, rowData) {
    const row = document.getElementById(rowId);
    if (!row) {
        console.warn(`Row with ID '${rowId}' not found.`);
        return;
    }

    // Map the data keys to their respective cell indices
    const cellOrderMap = [
        { key: 'change', cellIndex: 1 },
        { key: 'actual', cellIndex: 2 },
        { key: 'open', cellIndex: 3 },
        { key: 'priorDayClose', cellIndex: 4 },
        { key: 'high', cellIndex: 5 },
        { key: 'low', cellIndex: 6 },
        { key: 'updated', cellIndex: 7 }
    ];

    cellOrderMap.forEach(mapping => {
        const cell = row.children[mapping.cellIndex];
        const value = rowData[mapping.key];

        if (cell && value !== undefined) {
            cell.textContent = formatValue(value);

            if (mapping.key === 'change') {
                // Remove existing classes first
                cell.classList.remove('positive', 'negative');
                const numericChange = parseFloat(value);
                if (!isNaN(numericChange)) {
                    if (numericChange < 0) {
                        cell.classList.add('negative');
                    } else if (numericChange > 0) {
                        cell.classList.add('positive');
                    }
                } else if (typeof value === 'string') {
                    if (value.startsWith('-')) {
                        cell.classList.add('negative');
                    } else if (value.startsWith('+')) {
                        cell.classList.add('positive');
                    }
                }
            }
        } else if (cell) {
             cell.textContent = '--'; // Set to default if data is missing
        }
    });
}

// Helper to format missing data
function formatValue(val) {
    return val !== null && val !== undefined && val !== "" ? val : "--";
}

// Helper to format percentage values (e.g., 6.474 to 6.474%)
function formatPercentage(val) {
    const formatted = formatValue(val);
    return formatted !== '--' ? `${formatted}%` : '--';
}

// Helper to format large numbers with commas and optional units
function formatNumberWithCommas(val, unit = '') {
    const formatted = formatValue(val);
    if (formatted === '--') return formatted;
    // For large numbers, apply comma formatting
    let num = parseFloat(formatted);
    if (!isNaN(num)) {
        return num.toLocaleString('en-US') + unit;
    }
    return formatted; // Return as-is if not a valid number
}

// Helper to format monthly change with +/- sign and color for economic indicators
function formatMonthlyChange(val, unit = '') {
    const changeElement = document.createElement('span'); // Create a temporary span to apply classes
    let formattedChange = formatValue(val);

    changeElement.classList.remove('positive', 'negative');
    if (formattedChange !== '--' && parseFloat(formattedChange) !== 0) {
        const numericChange = parseFloat(formattedChange);
        if (numericChange > 0) {
            formattedChange = `+${numericChange}${unit}`;
            changeElement.classList.add('positive');
        } else {
            formattedChange = `${numericChange}${unit}`;
            changeElement.classList.add('negative');
        }
    } else {
        formattedChange = ''; // No display for 0 or -- change
    }
    changeElement.textContent = formattedChange;
    return changeElement; // Return the span element, not just text
}


// --- Function for frequently updated Market Data (US10Y, Bond Tickers) ---
async function fetchAndUpdateMarketData() {
    console.log("Fetching market data...");

    try {
        // --- Fetch Top Dashboard Data (for US10Y and Header UMBS) ---
        const resTop = await fetch("/.netlify/functions/getTopDashboardData");
        if (!resTop.ok) {
            throw new Error(`HTTP error! status: ${resTop.status}`);
        }
        const dataTop = await resTop.json();

        // --- US10Y Update in Header ---
        if (dataTop?.US10Y) {
            const us10yYield = parseFloat(dataTop.US10Y.yield);
            const us10yChange = parseFloat(dataTop.US10Y.change);
            updateChangeIndicator('us10yValue', 'us10yChange', us10yYield.toFixed(3), us10yChange.toFixed(3));
        } else {
            console.warn("US10Y data not found in getTopDashboardData response.");
        }

        // --- Update Header UMBS 5.5 ---
        // --- Update Header UMBS 5.5 ---
if (dataTop?.UMBS_5_5) {
    const umbs55Value = parseFloat(dataTop.UMBS_5_5.current);
    const umbs55Change = parseFloat(dataTop.UMBS_5_5.change);
    updateChangeIndicator('umbs55Value', 'umbs55Change',
        isNaN(umbs55Value) ? "--" : umbs55Value.toFixed(3),
        isNaN(umbs55Change) ? "--" : umbs55Change.toFixed(3)
    );
} else {
    console.warn("UMBS_5_5 data not found for header in getTopDashboardData response.");
}

// --- Update Header GNMA 5.5 ---
if (dataTop?.GNMA_5_5) {
    const gnma55Value = parseFloat(dataTop.GNMA_5_5.current);
    const gnma55Change = parseFloat(dataTop.GNMA_5_5.change);
    updateChangeIndicator('gnma55Value', 'gnma55Change',
        isNaN(gnma55Value) ? "--" : gnma55Value.toFixed(3),
        isNaN(gnma55Change) ? "--" : gnma55Change.toFixed(3)
    );
} else {
    console.warn("GNMA_5_5 data not found for header in getTopDashboardData response.");
}


        // --- Update Header 30Y Fixed (using data from Daily Rates if available, or default to --) ---
        // This will be updated by fetchAndUpdateDailyRates, so initial load can be '--'
        // Keeping these two lines so they are consistently initialized, then updated by the daily rates fetch.
        updateTextElement('fixed30yCurrentHeader', '--');
        updateTextElement('fixed30yDailyChangeHeader', '--');


        // --- Update Header Timestamp (if available from Top Dashboard Data) ---
        const timestampEl = document.querySelector(".header-time");
        if (dataTop?.UMBS_5_5?.last_updated && timestampEl) {
            const rawTime = dataTop.UMBS_5_5.last_updated;
            const dateObj = new Date(rawTime.replace(" ", "T")); // Replaces space with 'T' for robust parsing
            if (!isNaN(dateObj.getTime())) {
                const timeString = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Phoenix' }); // MST (Arizona)
                const dateString = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
                timestampEl.textContent = `${timeString} ${dateString}`;
            } else {
                console.warn("Invalid date for header timestamp:", rawTime);
                timestampEl.textContent = 'N/A';
            }
        }


        // --- Fetch All Bond Data (for all bonds) ---
        const resAll = await fetch("/.netlify/functions/getAllBondData");
        if (!resAll.ok) {
            throw new Error(`HTTP error! status: ${resAll.status}`);
        }
        const dataAll = await resAll.json();

        // --- Common formatted update time for all bonds in the table ---
        const bondUpdateTime = dataAll.last_updated;
        let formattedBondUpdateTime = 'N/A';

        if (bondUpdateTime) {
            try {
                const dateObj = new Date(bondUpdateTime.replace(" ", "T"));
                if (!isNaN(dateObj.getTime())) {
                    formattedBondUpdateTime = dateObj.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'America/Phoenix' // Assuming MST for bond market times
                    });
                }
            } catch (e) {
                console.warn("Could not parse bond update time for table rows:", e);
            }
        }

        // --- Update Bond Ticker Table Rows ---
        updateBondTableRow('umbs55Row', {
            change: formatValue(dataAll.UMBS_5_5?.change), actual: formatValue(dataAll.UMBS_5_5?.current),
            open: formatValue(dataAll.UMBS_5_5?.open), priorDayClose: formatValue(dataAll.UMBS_5_5?.prevClose),
            high: formatValue(dataAll.UMBS_5_5?.high), low: formatValue(dataAll.UMBS_5_5?.low),
            updated: formattedBondUpdateTime
        });
        updateBondTableRow('umbs60Row', {
            change: formatValue(dataAll.UMBS_6_0?.change), actual: formatValue(dataAll.UMBS_6_0?.current),
            open: formatValue(dataAll.UMBS_6_0?.open), priorDayClose: formatValue(dataAll.UMBS_6_0?.prevClose),
            high: formatValue(dataAll.UMBS_6_0?.high), low: formatValue(dataAll.UMBS_6_0?.low),
            updated: formattedBondUpdateTime
        });
        updateBondTableRow('gnma55Row', {
            change: formatValue(dataAll.GNMA_5_5?.change), actual: formatValue(dataAll.GNMA_5_5?.current),
            open: formatValue(dataAll.GNMA_5_5?.open), priorDayClose: formatValue(dataAll.GNMA_5_5?.prevClose),
            high: formatValue(dataAll.GNMA_5_5?.high), low: formatValue(dataAll.GNMA_5_5?.low),
            updated: formattedBondUpdateTime
        });
        updateBondTableRow('gnma60Row', {
            change: formatValue(dataAll.GNMA_6_0?.change), actual: formatValue(dataAll.GNMA_6_0?.current),
            open: formatValue(dataAll.GNMA_6_0?.open), priorDayClose: formatValue(dataAll.GNMA_6_0?.prevClose),
            high: formatValue(dataAll.GNMA_6_0?.high), low: formatValue(dataAll.GNMA_6_0?.low),
            updated: formattedBondUpdateTime
        });
        updateBondTableRow('shadow55Row', {
            change: formatValue(dataAll.UMBS_5_5_Shadow?.change), actual: formatValue(dataAll.UMBS_5_5_Shadow?.current),
            open: formatValue(dataAll.UMBS_5_5_Shadow?.open), priorDayClose: formatValue(dataAll.UMBS_5_5_Shadow?.prevClose),
            high: formatValue(dataAll.UMBS_5_5_Shadow?.high), low: formatValue(dataAll.UMBS_5_5_Shadow?.low),
            updated: formattedBondUpdateTime
        });
        updateBondTableRow('shadow60Row', {
            change: formatValue(dataAll.UMBS_6_0_Shadow?.change), actual: formatValue(dataAll.UMBS_6_0_Shadow?.current),
            open: formatValue(dataAll.UMBS_6_0_Shadow?.open), priorDayClose: formatValue(dataAll.UMBS_6_0_Shadow?.prevClose),
            high: formatValue(dataAll.UMBS_6_0_Shadow?.high), low: formatValue(dataAll.UMBS_6_0_Shadow?.low),
            updated: formattedBondUpdateTime
        });
        updateBondTableRow('shadowGMNA55Row', {
            change: formatValue(dataAll.GNMA_5_5_Shadow?.change), actual: formatValue(dataAll.GNMA_5_5_Shadow?.current),
            open: formatValue(dataAll.GNMA_5_5_Shadow?.open), priorDayClose: formatValue(dataAll.GNMA_5_5_Shadow?.prevClose),
            high: formatValue(dataAll.GNMA_5_5_Shadow?.high), low: formatValue(dataAll.GNMA_5_5_Shadow?.low),
            updated: formattedBondUpdateTime
        });
        updateBondTableRow('shadowGMNA60Row', {
            change: formatValue(dataAll.GNMA_6_0_Shadow?.change), actual: formatValue(dataAll.GNMA_6_0_Shadow?.current),
            open: formatValue(dataAll.GNMA_6_0_Shadow?.open), priorDayClose: formatValue(dataAll.GNMA_6_0_Shadow?.prevClose),
            high: formatValue(dataAll.GNMA_6_0_Shadow?.high), low: formatValue(dataAll.GNMA_6_0_Shadow?.low),
            updated: formattedBondUpdateTime
        });


    } catch (err) {
        console.error("Market data fetch error:", err);
    }
}

// --- Function for Daily Rates (less frequent update) ---
async function fetchAndUpdateDailyRates() {
    console.log("Fetching daily rates data...");

    try {
        const resRates = await fetch("/.netlify/functions/getDailyRatesData");
        if (!resRates.ok) {
            throw new Error(`HTTP error! status: ${resRates.status}`);
        }
        const dailyRatesData = await resRates.json();

        // Helper to update daily rate boxes
        function updateDailyRateBox(prefix, data) {
            // Update Current, Yesterday, Last Month, 1 Year Ago
            updateTextElement(`${prefix}Current`, formatPercentage(data?.latest));
            updateTextElement(`${prefix}Yesterday`, formatPercentage(data?.yesterday));
            updateTextElement(`${prefix}LastMonth`, formatPercentage(data?.last_month));
            updateTextElement(`${prefix}YearAgo`, formatPercentage(data?.year_ago));

            // Update Daily Change (Current vs Yesterday for rates)
            const dailyChangeElement = document.getElementById(`${prefix}DailyChange`);
            if (dailyChangeElement) {
                const changeValue = formatValue(data?.daily_change);
                // Ensure daily_change for rates is always treated as a number for formatting
                const numericChange = parseFloat(changeValue);

                dailyChangeElement.textContent = ''; // Clear previous content
                dailyChangeElement.classList.remove('positive', 'negative');

                if (!isNaN(numericChange) && numericChange !== 0) {
                    let formattedChange = numericChange.toFixed(3); // Adjust precision as needed
                    if (numericChange > 0) {
                        formattedChange = `+${formattedChange}%`;
                        dailyChangeElement.classList.add('positive');
                    } else {
                        formattedChange = `${formattedChange}%`;
                        dailyChangeElement.classList.add('negative');
                    }
                    dailyChangeElement.textContent = formattedChange;
                }
            }

            // Update individual box timestamp
            const updateTimeElement = document.getElementById(`${prefix}BoxUpdateTime`);
            if (updateTimeElement && data?.latest_date) {
                const dateObj = new Date(data.latest_date + 'T00:00:00'); // Ensure date parsing
                if (!isNaN(dateObj.getTime())) {
                    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
                    updateTimeElement.textContent = `As Of: ${formattedDate}`;
                } else {
                    updateTimeElement.textContent = 'As Of: N/A';
                }
            } else if (updateTimeElement) {
                updateTimeElement.textContent = 'As Of: N/A';
            }
        }

        updateDailyRateBox('fixed30y', dailyRatesData.fixed30Y);
        updateDailyRateBox('va30y', dailyRatesData.va30Y);
        updateDailyRateBox('fha30y', dailyRatesData.fha30Y);
        updateDailyRateBox('jumbo30y', dailyRatesData.jumbo30Y);
        updateDailyRateBox('usda30y', dailyRatesData.usda30y);
        updateDailyRateBox('fixed15y', dailyRatesData.fixed15Y);

        // Update 30Y Fixed in header with data from daily rates
        const fixed30yData = dailyRatesData.fixed30Y;
        if (fixed30yData) {
            const currentRate = parseFloat(fixed30yData.latest);
            const dailyChange = parseFloat(fixed30yData.daily_change);
            if (!isNaN(currentRate) && !isNaN(dailyChange)) {
                updateChangeIndicator('fixed30yCurrentHeader', 'fixed30yDailyChangeHeader', currentRate.toFixed(3), dailyChange.toFixed(3));
            }
        }


    } catch (err) {
        console.error("Daily Rates data fetch error:", err);
    }
}

// --- Function for Economic Indicators (less frequent update) ---
async function fetchAndUpdateEconomicIndicators() {
    console.log("Fetching economic indicators data...");

    try {
        const res = await fetch("/.netlify/functions/getEconomicIndicatorsData");
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();

        function updateEconomicIndicatorBox(prefix, indicatorData, unit = '', isPercentage = false) {
            if (!indicatorData) {
                console.warn(`No data for ${prefix}`);
                updateTextElement(`${prefix}Current`, '--');
                updateTextElement(`${prefix}LastMonth`, '--');
                updateTextElement(`${prefix}YearAgo`, '--');
                const monthlyChangeElement = document.getElementById(`${prefix}MonthlyChange`);
                if (monthlyChangeElement) monthlyChangeElement.textContent = '';
                updateTextElement(`${prefix}UpdateTime`, 'As Of: N/A');
                return;
            }

            // Current, Last Month, 1 Year Ago Values
            const currentVal = isPercentage ? formatPercentage(indicatorData.latest) : formatNumberWithCommas(indicatorData.latest, unit);
            const lastMonthVal = isPercentage ? formatPercentage(indicatorData.last_month) : formatNumberWithCommas(indicatorData.last_month, unit);
            const yearAgoVal = isPercentage ? formatPercentage(indicatorData.year_ago) : formatNumberWithCommas(indicatorData.year_ago, unit);

            updateTextElement(`${prefix}Current`, currentVal);
            updateTextElement(`${prefix}LastMonth`, lastMonthVal);
            updateTextElement(`${prefix}YearAgo`, yearAgoVal);

            // Monthly Change
            const monthlyChangeElement = document.getElementById(`${prefix}MonthlyChange`);
            if (monthlyChangeElement) {
                const changeSpan = formatMonthlyChange(indicatorData.monthly_change, isPercentage ? '%' : '');
                monthlyChangeElement.innerHTML = '';
                monthlyChangeElement.appendChild(changeSpan);
            }

            // "As Of" Date
            const updateTimeElement = document.getElementById(`${prefix}UpdateTime`);
            if (updateTimeElement && indicatorData.latest_date) {
                const dateObj = new Date(indicatorData.latest_date + 'T00:00:00');
                if (!isNaN(dateObj.getTime())) {
                    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
                    updateTimeElement.textContent = `As Of: ${formattedDate}`;
                } else {
                    updateTimeElement.textContent = 'As Of: N/A';
                }
            } else if (updateTimeElement) {
                updateTimeElement.textContent = 'As Of: N/A';
            }
        }

        // --- Update each Economic Indicator Box ---
        updateEconomicIndicatorBox('houst', data.HOUST, 'k');
        updateEconomicIndicatorBox('permit1', data.PERMIT1, 'k');
        updateEconomicIndicatorBox('houst1f', data.HOUST1F, 'k'); // Added HOUST1F from previous iteration
        updateEconomicIndicatorBox('rsxfs', data.RSXFS, 'M');
        updateEconomicIndicatorBox('umcsent', data.UMCSENT);
        updateEconomicIndicatorBox('csushpinsa', data.CSUSHPINSA);
        updateEconomicIndicatorBox('permit', data.PERMIT, 'k');
        updateEconomicIndicatorBox('t10yie', data.T10YIE, '', true);
        updateEconomicIndicatorBox('t10y2y', data.T10Y2Y, '', true);


    } catch (err) {
        console.error("Economic indicators data fetch error:", err);
    }
}

// --- Function for Live Stock Data (UPDATED for Percentage Change Only) ---
async function fetchAndUpdateLiveStockData() {
    console.log("Fetching live stock data...");
    try {
        const res = await fetch("/.netlify/functions/getLiveStockData");
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const stockData = await res.json();

        // Helper to update stock header with percentage change only
        function updateStockPercentageDisplay(valueElementId, changeElementId, data) {
          const changeEl = document.getElementById(changeElementId);

          if (changeEl) {
                // Clear previous content and classes
            changeEl.textContent = '';
            changeEl.classList.remove('positive', 'negative');

    if (data && typeof data.percentChange !== 'undefined') {
      const percent = parseFloat(data.percentChange);
      if (!isNaN(percent)) {
        let formatted = percent.toFixed(2);
        if (percent > 0) {
          formatted = `+${formatted}%`;
          changeEl.classList.add('positive');
        } else if (percent < 0) {
          formatted = `${formatted}%`;
          changeEl.classList.add('negative');
        } else {
          formatted = '0.00%';
        }
        changeEl.textContent = formatted;
      } else {
        changeEl.textContent = '--';
      }
    } else {
      changeEl.textContent = '--';
    }
  } else {
    console.warn(`Element ${changeElementId} not found for stock update.`);
  }
}



        // Update SPY (SP500)
        updateStockPercentageDisplay('spyValue', 'spyChange', stockData.SPY);

        // Update QQQ (NSDQ)
        updateStockPercentageDisplay('qqqValue', 'qqqChange', stockData.QQQ);

        // Update DIA (Dow)
        updateStockPercentageDisplay('diaValue', 'diaChange', stockData.DIA);


    } catch (err) {
        console.error("Live stock data fetch error:", err);
    }
}


// --- Event Listener and Interval Setup ---
document.addEventListener("DOMContentLoaded", () => {
    // Initial fetch for all data when the page loads
    fetchAndUpdateMarketData();
    fetchAndUpdateDailyRates();
    fetchAndUpdateEconomicIndicators();
    fetchAndUpdateLiveStockData(); // Initial fetch for stock data

    // Set interval for market data to refresh every 60 seconds
    setInterval(fetchAndUpdateMarketData, 60000); // 60 seconds

    // Set interval for live stock data to 30 seconds (UPDATED)
    setInterval(fetchAndUpdateLiveStockData, 30000); // 30 seconds

    // Daily rates and economic indicators typically don't change intra-day.
    // They will refresh on page load. If a tab is open for multiple days,
    // a page refresh (F5) would be needed for the newest daily/monthly rates.
});
