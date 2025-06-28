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
 * Formats a raw timestamp string to HH:MM (e.g., "02:55 PM") or "N/A".
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
        // === TOP DASHBOARD DATA (US10Y) ===
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

        // --- Update Header Timestamp (Example from UMBS_5_5 in Top Data) ---
        const timestampEl = document.querySelector(".header-time");
        if (dataTop?.UMBS_5_5?.last_updated && timestampEl) {
            const rawTime = dataTop.UMBS_5_5.last_updated;
            const dateObj = new Date(rawTime.replace(" ", "T"));
            const timeString = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            const dateString = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
            timestampEl.textContent = `${timeString} ${dateString}`;
        }


        // === SHADOW 5.5 BOND DATA (from getShadowBondsData) ===
        // This call will hit your getShadowBondsData.js which returns a FLAT object.
        const resShadowBond = await fetch("/.netlify/functions/getShadowBondsData");
        if (!resShadowBond.ok) {
            throw new Error(`HTTP error fetching Shadow Bond Data! Status: ${resShadowBond.status}`);
        }
        const dataShadowBond = await resShadowBond.json();
        console.log("Shadow 5.5 Raw Data (from getShadowBondsData):", dataShadowBond);

        // Access the specific data points directly from the flat response
        const shadow55Change = dataShadowBond.UMBS_5_5_Daily_Change;
        const shadow55Actual = dataShadowBond.UMBS_5_5_Current;
        const shadow55UpdatedRaw = dataShadowBond.last_updated; // This will likely be null or 'N/A' as per your backend

        // Format the updated time
        const shadow55UpdatedFormatted = formatTimeToHHMM(shadow55UpdatedRaw);
        console.log("Shadow 5.5 Formatted Updated Time:", shadow55UpdatedFormatted);


        // --- Update the Shadow 5.5 row in the table ---
        const shadow55Row = document.getElementById('shadow55Row');
        if (shadow55Row) {
            // Get the cells of the specific row (skipping the first cell which is the instrument name)
            const cells = Array.from(shadow55Row.children).slice(1);

            // Ensure there are enough cells before attempting to update
            if (cells.length >= 7) { // change, actual, open, prevClose, high, low, updated
                // Change with color + arrow
                const changeVal = formatValue(shadow55Change);
                cells[0].textContent = changeVal;
                cells[0].classList.remove("positive", "negative");
                if (changeVal.startsWith("-")) {
                    cells[0].classList.add("negative");
                    cells[0].textContent = `↓ ${changeVal}`;
                } else if (changeVal !== "--") { // Only add arrow if it's not empty or negative
                    cells[0].classList.add("positive");
                    cells[0].textContent = `↑ ${changeVal}`;
                }

                // Other bond values (these will likely be '--' as the backend doesn't provide them in this version)
                cells[1].textContent = formatValue(shadow55Actual);       // Actual
                cells[2].textContent = "--";                              // Open (not provided by this backend function)
                cells[3].textContent = "--";                              // Prior Day Close (not provided)
                cells[4].textContent = "--";                              // High (not provided)
                cells[5].textContent = "--";                              // Low (not provided)
                cells[6].textContent = formatValue(shadow55UpdatedFormatted); // Updated

            } else {
                console.warn(`Not enough cells found for row 'shadow55Row' to update all data.`);
            }
        } else {
            console.warn(`Target row with ID 'shadow55Row' not found.`);
        }


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
