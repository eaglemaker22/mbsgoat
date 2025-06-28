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
        if (typeof change === 'string' && change.startsWith('-')) {
            changeElement.classList.add('negative');
        } else if (typeof change === 'string' && change.startsWith('+')) {
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
 * Helper to format missing data
 * @param {any} val - The value to format.
 * @returns {string} Formatted value or "--".
 */
function formatValue(val) {
    return val !== null && val !== undefined && val !== "" ? val : "--";
}

/**
 * Formats a raw timestamp string to HH:MM (e.g., "02:55 PM").
 * @param {string} rawTimestamp - The timestamp string (e.g., "YYYY-MM-DD HH:MM:SS").
 * @returns {string} Formatted time or "N/A".
 */
function formatTimeToHHMM(rawTimestamp) {
    if (typeof rawTimestamp === 'string' && rawTimestamp.trim() !== '') {
        try {
            const dateObj = new Date(rawTimestamp.replace(' ', 'T'));
            if (!isNaN(dateObj.getTime())) {
                return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        } catch (e) {
            console.warn("Error parsing timestamp to Date object:", e);
        }
    }
    return "N/A";
}


// --- Data Fetching Logic using Netlify Functions ---
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Fetching data from Netlify Functions...");

    try {
        // === TOP DASHBOARD DATA ===
        const resTop = await fetch("/.netlify/functions/getTopDashboardData");
        if (!resTop.ok) {
            throw new Error(`HTTP error fetching Top Dashboard Data! Status: ${resTop.status}`);
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

        // --- Update Header Timestamp ---
        const timestampEl = document.querySelector(".header-time");
        if (dataTop?.UMBS_5_5?.last_updated && timestampEl) {
            const rawTime = dataTop.UMBS_5_5.last_updated;
            const dateObj = new Date(rawTime.replace(" ", "T"));
            const timeString = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            const dateString = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
            timestampEl.textContent = `${timeString} ${dateString}`;
        }


        // === FULL BOND TABLE DATA (specifically for Shadow Bonds from getShadowBondsData) ===
        // Calling your getShadowBondsData function which now returns all shadow bond data
        const resAllShadowBonds = await fetch("/.netlify/functions/getShadowBondsData");
        if (!resAllShadowBonds.ok) {
            throw new Error(`HTTP error fetching Shadow Bond Data! Status: ${resAllShadowBonds.status}`);
        }
        const dataShadowBonds = await resAllShadowBonds.json();
        console.log("Shadow Bond Data (from getShadowBondsData):", dataShadowBonds);

        // Define the specific keys for the shadow bonds we want to update
        const shadowBondKeys = [
            "UMBS_5_5_Shadow", "UMBS_6_0_Shadow", "GNMA_5_5_Shadow", "GNMA_6_0_Shadow"
        ];

        // Overall update time for the bond table, pulled from the new function's response
        const overallBondUpdatedTime = formatTimeToHHMM(dataShadowBonds.last_updated);
        console.log("Overall Shadow Bond Updated Time:", overallBondUpdatedTime);


        shadowBondKeys.forEach((key) => {
            // Access the bond data using the key (e.g., dataShadowBonds.UMBS_5_5_Shadow)
            const bond = dataShadowBonds[key] || {};

            // Determine the target row ID based on the bond key
            let targetRowId = '';
            if (key === "UMBS_5_5_Shadow") targetRowId = "shadow55Row";
            // Add more conditions here if you want to update other shadow bond rows dynamically
            // else if (key === "UMBS_6_0_Shadow") targetRowId = "shadow60Row"; etc.
            // For now, only shadow55Row is uniquely ID'd in your HTML snippet.

            if (targetRowId) {
                const row = document.getElementById(targetRowId);
                if (row) {
                    // Get the cells of the specific row (skipping the first cell which is the instrument name)
                    const cells = Array.from(row.children).slice(1); // Convert HTMLCollection to Array and slice

                    // Ensure there are enough cells before attempting to update
                    if (cells.length >= 7) { // change, actual, open, prevClose, high, low, updated
                        // Change with color + arrow
                        const changeVal = formatValue(bond.change);
                        cells[0].textContent = changeVal; // 0-indexed cell for Change
                        cells[0].classList.remove("positive", "negative");
                        if (changeVal.startsWith("-")) {
                            cells[0].classList.add("negative");
                            cells[0].textContent = `↓ ${changeVal}`;
                        } else if (changeVal !== "--") {
                            cells[0].classList.add("positive");
                            cells[0].textContent = `↑ ${changeVal}`;
                        }

                        // Other bond values
                        cells[1].textContent = formatValue(bond.current);     // Actual
                        cells[2].textContent = formatValue(bond.open);        // Open
                        cells[3].textContent = formatValue(bond.prevClose);   // Prior Day Close
                        cells[4].textContent = formatValue(bond.high);        // High
                        cells[5].textContent = formatValue(bond.low);         // Low
                        cells[6].textContent = overallBondUpdatedTime;        // Updated (using overall time)

                    } else {
                        console.warn(`Not enough cells found for row '${targetRowId}' to update all data.`);
                    }
                } else {
                    console.warn(`Target row with ID '${targetRowId}' not found.`);
                }
            } else {
                // If a shadow bond key doesn't have a specific ID, we skip it for now.
                // console.log(`No specific row ID defined for bond key: ${key}. Skipping update.`);
            }
        });


        // === DAILY RATES SECTION (Still placeholder, as requested) ===
        updateTextElement('va30yToday', '---');
        updateTextElement('va30yYesterday', '---');
        updateTextElement('va30yLastWeek', '---');


    } catch (err) {
        console.error("Dashboard data fetch error:", err);
        // You might want to display an error message on the page here
        // document.getElementById('mainErrorDisplay').textContent = `Error loading data: ${err.message}`;
    }
});
