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
 *
 * NOTE: The keys here (`change`, `actual` etc.) must match the keys returned by your Netlify Function for this bond type.
 */
function updateBondTableRow(rowId, rowData) {
    const row = document.getElementById(rowId);
    if (!row) {
        console.warn(`Row with ID '${rowId}' not found.`);
        return;
    }

    // Get the cells starting from the second one (index 1), as the first is the Instrument name
    const cells = row.children;

    // Define the order of data and the corresponding cell index
    // This mapping assumes the order of <td> elements in your HTML for this row
    const cellOrderMap = [
        { key: 'change', cellIndex: 1 },
        { key: 'actual', cellIndex: 2 },
        { key: 'open', cellIndex: 3 },
        { key: 'priorDayClose', cellIndex: 4 }, // Maps to "Prior Day Close" header
        { key: 'high', cellIndex: 5 },
        { key: 'low', cellIndex: 6 },
        { key: 'updated', cellIndex: 7 }
    ];

    cellOrderMap.forEach(mapping => {
        const cell = cells[mapping.cellIndex];
        const value = rowData[mapping.key];

        if (cell && value !== undefined) {
            cell.textContent = value;

            // Special handling for the 'change' column to apply colors
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
             cell.textContent = '--'; // Default for missing data
        }
    });
}

// Helper to format missing data (re-added from your original script for consistency)
function formatValue(val) {
    return val !== null && val !== undefined && val !== "" ? val : "--";
}

// Helper to format percentage values (e.g., 6.474 to 6.474%)
function formatPercentage(val) {
    const formatted = formatValue(val);
    return formatted !== '--' ? `${formatted}%` : '--';
}

// --- Data Fetching Logic using Netlify Functions ---
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Fetching data from Netlify Functions...");

    try {
        // --- Fetch Top Dashboard Data (for US10Y) ---
        const resTop = await fetch("/.netlify/functions/getTopDashboardData");
        if (!resTop.ok) {
            throw new Error(`HTTP error! status: ${resTop.status}`);
        }
        const dataTop = await resTop.json();
        console.log("Top Dashboard Data:", dataTop);

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
        if (dataTop?.UMBS_5_5?.last_updated && timestampEl) { // Note: This uses dataTop's timestamp
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
        console.log("All Bond Data:", dataAll);

        // --- Common formatted update time for all bonds in the table ---
        // This timestamp comes from dataAll.last_updated, which is from mbs_products
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
                        timeZone: 'America/Los_Angeles'
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
                low: formatValue(gnma60ShadowData.low),
                updated: formatValue(formattedBondUpdateTime)
            };
            updateBondTableRow('shadowGMNA60Row', rowData);
        } else {
            console.warn("GNMA_6_0_Shadow data not found in getAllBondData response.");
        }


        // --- Daily Rates Section ---
        const resRates = await fetch("/.netlify/functions/getDailyRatesData");
        if (!resRates.ok) {
            throw new Error(`HTTP error! status: ${resRates.status}`);
        }
        const dailyRatesData = await resRates.json();
        console.log("Daily Rates Data:", dailyRatesData);

        // Helper to update daily rate boxes
        function updateDailyRateBox(prefix, data) {
            if (data) {
                updateTextElement(`${prefix}Today`, formatPercentage(data.latest));
                // We'll add Yesterday/Last Week/Year later
            } else {
                updateTextElement(`${prefix}Today`, '--');
                // updateTextElement(`${prefix}Yesterday`, '--');
                // updateTextElement(`${prefix}LastWeek`, '--');
                // updateTextElement(`${prefix}LastYear`, '--');
            }
        }

        updateDailyRateBox('fixed30y', dailyRatesData.fixed30Y);
        updateDailyRateBox('va30y', dailyRatesData.va30Y);
        updateDailyRateBox('fha30y', dailyRatesData.fha30Y);
        updateDailyRateBox('jumbo30y', dailyRatesData.jumbo30Y);
        updateDailyRateBox('usda30y', dailyRatesData.usda30Y);
        updateDailyRateBox('fixed15y', dailyRatesData.fixed15Y); // Using new ID

        // Update Daily Rates section timestamp
        const dailyRatesUpdateTimeEl = document.getElementById('dailyRatesUpdateTime');
        if (dailyRatesData.last_updated && dailyRatesUpdateTimeEl) {
            // Assuming last_updated is 'YYYY-MM-DD' from the Netlify function
            const dateObj = new Date(dailyRatesData.last_updated + 'T00:00:00'); // Add time part to make it valid for Date object
            if (!isNaN(dateObj.getTime())) {
                const dateString = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
                // We don't have time part for daily rates yet, just date
                dailyRatesUpdateTimeEl.textContent = `Updated: ${dateString}`;
            } else {
                dailyRatesUpdateTimeEl.textContent = 'Updated: N/A';
            }
        } else if (dailyRatesUpdateTimeEl) {
            dailyRatesUpdateTimeEl.textContent = 'Updated: N/A';
        }


    } catch (err) {
        console.error("Dashboard data fetch error:", err);
        // Display error messages on the dashboard if desired
        // document.getElementById('errorDisplay').textContent = "Failed to load data.";
    }
});
