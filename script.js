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
 * Updates a change indicator (value and color) for header items or general use.
 * @param {string} valueElementId - ID for the main value span.
 * @param {string} changeElementId - ID for the change span.
 * @param {string} value - The main value (e.g., "4.425").
 * @param {string} change - The change value (e.g., "-0.212").
 */
function updateChangeIndicator(valueElementId, changeElementId, value, change) {
    updateTextElement(valueElementId, value);
    const changeElement = document.getElementById(changeElementId);
    if (changeElement) {
        changeElement.textContent = change; // Display the change value as-is

        changeElement.classList.remove('positive', 'negative');
        if (change.startsWith('-')) {
            changeElement.classList.add('negative');
        } else if (change.startsWith('+')) {
            changeElement.classList.add('positive');
        } else {
            // If it's a number that might not have a sign, check its value
            const numericChange = parseFloat(change);
            if (!isNaN(numericChange)) {
                if (numericChange > 0) {
                    changeElement.classList.add('positive');
                } else if (numericChange < 0) {
                    changeElement.classList.add('negative');
                }
            }
        }
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

    const cells = row.children;

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
        const cell = cells[mapping.cellIndex];
        const value = rowData[mapping.key];

        if (cell && value !== undefined) {
            cell.textContent = value;

            if (mapping.key === 'change') {
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
             cell.textContent = '--';
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
    return formatted;
}

// Helper to format monthly change with +/- sign and color
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
    console.log("Fetching market data..."); // Log each market data refresh

    try {
        // --- Fetch Top Dashboard Data (for US10Y) ---
        const resTop = await fetch("/.netlify/functions/getTopDashboardData");
        if (!resTop.ok) {
            throw new Error(`HTTP error! status: ${resTop.status}`);
        }
        const dataTop = await resTop.json();

        // --- US10Y Update ---
        if (dataTop?.US10Y) {
            const us10yValue = formatValue(dataTop.US10Y.yield);
            const us10yChange = formatValue(dataTop.US10Y.change);

            updateChangeIndicator('us10yValue', 'us10yChange', us10yValue, us10yChange);
        } else {
            console.warn("US10Y data not found in getTopDashboardData response.");
        }

        // --- Update Header Timestamp (if available from Top Dashboard Data) ---
        const timestampEl = document.querySelector(".header-time");
        if (dataTop?.UMBS_5_5?.last_updated && timestampEl) {
            const rawTime = dataTop.UMBS_5_5.last_updated;
            const dateObj = new Date(rawTime.replace(" ", "T"));
            const timeString = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            const dateString = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
            timestampEl.textContent = `${timeString} ${dateString}`;
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
                        timeZone: 'America/Los_Angeles' // Assuming PST/MST for bond market times
                    });
                }
            } catch (e) {
                console.warn("Could not parse bond update time for table rows:", e);
            }
        }

        // --- Update Header UMBS 5.5 ---
        const headerUmbs55Data = dataAll.UMBS_5_5;
        if (headerUmbs55Data) {
            const umbs55Value = formatValue(headerUmbs55Data.current);
            const umbs55Change = formatValue(headerUmbs55Data.change);
            updateChangeIndicator('ums55Value', 'ums55Change', umbs55Value, umbs55Change);
        } else {
            console.warn("UMBS_5_5 data not found for header in getAllBondData response.");
        }


        // --- Update UMBS 5.5 Table Row ---
        const umbs55Data = dataAll.UMBS_5_5;
        if (umbs55Data) {
            const rowData = {
                change: formatValue(umbs55Data.change),
                actual: formatValue(umbs55Data.current),
                open: formatValue(umbs55Data.open),
                priorDayClose: formatValue(umbs55Data.prevClose),
                high: formatValue(umbs55Data.high),
                low: formatValue(umbs55Data.low),
                updated: formatValue(formattedBondUpdateTime)
            };
            updateBondTableRow('umbs55Row', rowData);
        } else {
            console.warn("UMBS_5_5 data not found in getAllBondData response.");
        }

        // --- Update UMBS 6.0 Table Row ---
        const umbs60Data = dataAll.UMBS_6_0;
        if (umbs60Data) {
            const rowData = {
                change: formatValue(umbs60Data.change),
                actual: formatValue(umbs60Data.current),
                open: formatValue(umbs60Data.open),
                priorDayClose: formatValue(umbs60Data.prevClose),
                high: formatValue(umbs60Data.high),
                low: formatValue(umbs60Data.low),
                updated: formatValue(formattedBondUpdateTime)
            };
            updateBondTableRow('umbs60Row', rowData);
        } else {
            console.warn("UMBS_6_0 data not found in getAllBondData response.");
        }

        // --- Update GNMA 5.5 Table Row ---
        const gnma55Data = dataAll.GNMA_5_5;
        if (gnma55Data) {
            const rowData = {
                change: formatValue(gnma55Data.change),
                actual: formatValue(gnma55Data.current),
                open: formatValue(gnma55Data.open),
                priorDayClose: formatValue(gnma55Data.prevClose),
                high: formatValue(gnma55Data.high),
                low: formatValue(gnma55Data.low),
                updated: formatValue(formattedBondUpdateTime)
            };
            updateBondTableRow('gnma55Row', rowData);
        } else {
            console.warn("GNMA_5_5 data not found in getAllBondData response.");
        }

        // --- Update GNMA 6.0 Table Row ---
        const gnma60Data = dataAll.GNMA_6_0;
        if (gnma60Data) {
            const rowData = {
                change: formatValue(gnma60Data.change),
                actual: formatValue(gnma60Data.current),
                open: formatValue(gnma60Data.open),
                priorDayClose: formatValue(gnma60Data.prevClose),
                high: formatValue(gnma60Data.high),
                low: formatValue(gnma60Data.low),
                updated: formatValue(formattedBondUpdateTime)
            };
            updateBondTableRow('gnma60Row', rowData);
        } else {
            console.warn("GNMA_6_0 data not found in getAllBondData response.");
        }


        // --- Update Shadow 5.5 ---
        const umbs55ShadowData = dataAll.UMBS_5_5_Shadow;
        if (umbs55ShadowData) {
            const rowData = {
                change: formatValue(umbs55ShadowData.change),
                actual: formatValue(umbs55ShadowData.current),
                open: formatValue(umbs55ShadowData.open),
                priorDayClose: formatValue(umbs55ShadowData.prevClose),
                high: formatValue(umbs55ShadowData.high),
                low: formatValue(umbs55ShadowData.low),
                updated: formatValue(formattedBondUpdateTime)
            };
            updateBondTableRow('shadow55Row', rowData);
        } else {
            console.warn("UMBS_5_5_Shadow data not found in getAllBondData response.");
        }

        // --- Update Shadow 6.0 ---
        const umbs60ShadowData = dataAll.UMBS_6_0_Shadow;
        if (umbs60ShadowData) {
            const rowData = {
                change: formatValue(umbs60ShadowData.change),
                actual: formatValue(umbs60ShadowData.current),
                open: formatValue(umbs60ShadowData.open),
                priorDayClose: formatValue(umbs60ShadowData.prevClose),
                high: formatValue(umbs60ShadowData.high),
                low: formatValue(umbs60ShadowData.low),
                updated: formatValue(formattedBondUpdateTime)
            };
            updateBondTableRow('shadow60Row', rowData);
        } else {
            console.warn("UMBS_6_0_Shadow data not found in getAllBondData response.");
        }

        // --- Update Shadow GMNA 5.5 ---
        const gnma55ShadowData = dataAll.GNMA_5_5_Shadow;
        if (gnma55ShadowData) {
            const rowData = {
                change: formatValue(gnma55ShadowData.change),
                actual: formatValue(gnma55ShadowData.current),
                open: formatValue(gnma55ShadowData.open),
                priorDayClose: formatValue(gnma55ShadowData.prevClose),
                high: formatValue(gnma55ShadowData.high),
                low: formatValue(gnma55ShadowData.low),
                updated: formatValue(formattedBondUpdateTime)
            };
            updateBondTableRow('shadowGMNA55Row', rowData);
        } else {
            console.warn("GNMA_5_5_Shadow data not found in getAllBondData response.");
        }

        // --- Update Shadow GMNA 6.0 ---
        const gnma60ShadowData = dataAll.GNMA_6_0_Shadow;
        if (gnma60ShadowData) {
            const rowData = {
                change: formatValue(gnma60ShadowData.change),
                actual: formatValue(gnma60ShadowData.current),
                open: formatValue(gnma60ShadowData.open),
                priorDayClose: formatValue(gnma60ShadowData.prevClose),
                high: formatValue(gnma60ShadowData.high),
                low: formatValue(gnma60Data.low),
                updated: formatValue(formattedBondUpdateTime)
            };
            updateBondTableRow('shadowGMNA60Row', rowData);
        } else {
            console.warn("GNMA_6_0_Shadow data not found in getAllBondData response.");
        }


    } catch (err) {
        console.error("Market data fetch error:", err);
    }
}

// --- Function for Daily Rates (less frequent update) ---
async function fetchAndUpdateDailyRates() {
    console.log("Fetching daily rates data..."); // Log daily rates refresh

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

            // Update Daily Change (Current vs Last Month)
            const dailyChangeElement = document.getElementById(`${prefix}DailyChange`);
            if (dailyChangeElement) {
                const changeValue = formatValue(data?.daily_change);
                dailyChangeElement.textContent = changeValue !== '--' && parseFloat(changeValue) !== 0 ?
                                                    (parseFloat(changeValue) > 0 ? `+${changeValue}%` : `${changeValue}%`) :
                                                    ''; // Add % and sign, or empty if 0 or --
                dailyChangeElement.classList.remove('positive', 'negative');
                const numericChange = parseFloat(changeValue);
                if (!isNaN(numericChange)) {
                    if (numericChange > 0) {
                        dailyChangeElement.classList.add('positive');
                    } else if (numericChange < 0) {
                        dailyChangeElement.classList.add('negative');
                    }
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

    } catch (err) {
        console.error("Daily Rates data fetch error:", err);
    }
}

// --- New Function for Economic Indicators (less frequent update) ---
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
                // Clear previous content and append the new span
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
        updateEconomicIndicatorBox('houst', data.HOUST, 'k'); // Total Housing Starts (thousands)
        updateEconomicIndicatorBox('permit1', data.PERMIT1, 'k'); // Single-Family Permits (thousands)
        updateEconomicIndicatorBox('permit', data.PERMIT, 'k'); // Building Permits Total (thousands)
        updateEconomicIndicatorBox('rsxfs', data.RSXFS, 'M', false, true); // Retail Sales (Millions), assuming no percentage
        updateEconomicIndicatorBox('umcsent', data.UMCSENT, ''); // Consumer Sentiment (points)
        updateEconomicIndicatorBox('csushpinsa', data.CSUSHPINSA, ''); // Case-Shiller HPI (index value)
        updateEconomicIndicatorBox('t10yie', data.T10YIE, '', true); // 10Y Breakeven (percentage)
        updateEconomicIndicatorBox('t10y2y', data.T10Y2Y, '', true); // 10Y - 2Y Treasury (percentage points)


    } catch (err) {
        console.error("Economic indicators data fetch error:", err);
    }
}


// --- Event Listener and Interval Setup ---
document.addEventListener("DOMContentLoaded", () => {
    // Initial fetch for all data when the page loads
    fetchAndUpdateMarketData();
    fetchAndUpdateDailyRates();
    fetchAndUpdateEconomicIndicators(); // New: Fetch economic indicators on load

    // Set interval for market data to refresh every 60 seconds
    setInterval(fetchAndUpdateMarketData, 60000); // 60000 milliseconds = 60 seconds

    // No setInterval for daily rates or economic indicators, as they typically don't change intra-day.
    // If a tab is open for multiple days, a refresh is needed for new daily/monthly rates.
});
