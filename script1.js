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
        if (dataTop?.UMBS_5_5?.last_updated && timestampEl) {
            const rawTime = dataTop.UMBS_5_5.last_updated;
            const dateObj = new Date(rawTime.replace(" ", "T"));
            const timeString = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            const dateString = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
            timestampEl.textContent = `${timeString} ${dateString}`;
        }


        // --- Fetch All Bond Data (for Shadow 5.5 / UMBS_5_5_Shadow) ---
        const resAll = await fetch("/.netlify/functions/getAllBondData");
        if (!resAll.ok) {
            throw new Error(`HTTP error! status: ${resAll.status}`);
        }
        const dataAll = await resAll.json();
        console.log("All Bond Data:", dataAll);

        // --- Shadow 5.5 / UMBS_5_5_Shadow Update ---
        const umbs55ShadowData = dataAll.UMBS_5_5_Shadow;
        if (umbs55ShadowData) {
            const bondUpdateTime = dataAll.last_updated; // e.g., "2025-06-24 14:55:04"
            let formattedBondUpdateTime = 'N/A'; // Default value

            // FIX: Convert bondUpdateTime to Pacific Time with AM/PM
            if (bondUpdateTime) {
                try {
                    const dateObj = new Date(bondUpdateTime.replace(" ", "T"));
                    if (!isNaN(dateObj.getTime())) { // Check if date is valid
                        formattedBondUpdateTime = dateObj.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true, // For AM/PM (e.g., 2:55 PM)
                            timeZone: 'America/Los_Angeles' // Specify Pacific Time Zone
                        });
                    }
                } catch (e) {
                    console.warn("Could not parse bond update time for table row:", e);
                }
            }


            const rowData = {
                change: formatValue(umbs55ShadowData.change),
                actual: formatValue(umbs55ShadowData.current),
                open: formatValue(umbs55ShadowData.open),
                priorDayClose: formatValue(umbs55ShadowData.prevClose),
                high: formatValue(umbs55ShadowData.high),
                low: formatValue(umbs55ShadowData.low),
                updated: formatValue(formattedBondUpdateTime) // Using the correctly formatted time
            };
            
            updateBondTableRow('shadow55Row', rowData);
        } else {
            console.warn("UMBS_5_5_Shadow data not found in getAllBondData response.");
        }

        // --- 30Y VA Section (Ignored for now as requested) ---
        updateTextElement('va30yToday', '---');
        updateTextElement('va30yYesterday', '---');
        updateTextElement('va30yLastWeek', '---');


    } catch (err) {
        console.error("Dashboard data fetch error:", err);
        // Display error messages on the dashboard if desired
        // document.getElementById('errorDisplay').textContent = "Failed to load data.";
    }
});
