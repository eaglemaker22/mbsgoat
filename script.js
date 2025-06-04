// script.js

console.log("JavaScript Loaded and Running!");

// Helper function to safely update text content
function updateTextContent(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value !== null && value !== undefined ? value : 'N/A';
    } else {
        console.error(`Element with ID "${id}" not found in HTML.`);
    }
}

// Function to fetch and update MBS data
async function fetchMBSData() {
    try {
        const response = await fetch('/.netlify/functions/getData');
        const data = await response.json();

        if (response.ok) {
            // Update main MBS timestamp
            updateTextContent('mbs-timestamp', `MBS Data Last updated: ${data.timestamp}`);

            // Update US10Y Bond Yields (Open, Daily Change, Close - from Google Sheet)
            // Note: US10Y_Current will be updated by fetchUS10YData
            updateTextContent('us10y-open', data.US10Y_Open);
            updateTextContent('us10y-daily-change', data.US10Y_Daily_Change);
            updateTextContent('us10y-close', data.US10Y_Close);

            // Update UMBS 5.5
            updateTextContent('umbs-5-5-current', data.UMBS_5_5_Current);
            updateTextContent('umbs-5-5-open', data.UMBS_5_5_Open);
            updateTextContent('umbs-5-5-daily-change', data.UMBS_5_5_Daily_Change);
            updateTextContent('umbs-5-5-close', data.UMBS_5_5_Close);

            // Update UMBS 6.0
            updateTextContent('umbs-6-0-current', data.UMBS_6_0_Current);
            updateTextContent('umbs-6-0-open', data.UMBS_6_0_Open);
            updateTextContent('umbs-6-0-daily-change', data.UMBS_6_0_Daily_Change);
            updateTextContent('umbs-6-0-close', data.UMBS_6_0_Close);

            // Update GNMA 5.5
            updateTextContent('gnma-5-5-current', data.GNMA_5_5_Current);
            updateTextContent('gnma-5-5-open', data.GNMA_5_5_Open);
            updateTextContent('gnma-5-5-daily-change', data.GNMA_5_5_Daily_Change);
            updateTextContent('gnma-5-5-close', data.GNMA_5_5_Close);

            // Update GNMA 6.0
            updateTextContent('gnma-6-0-current', data.GNMA_6_0_Current);
            updateTextContent('gnma-6-0-open', data.GNMA_6_0_Open);
            updateTextContent('gnma-6-0-daily-change', data.GNMA_6_0_Daily_Change);
            updateTextContent('gnma-6-0-close', data.GNMA_6_0_Close);

            // Update Shadow Bonds (Open only)
            updateTextContent('umbs-5-5-shadow-open', data.UMBS_5_5_Shadow_Open);
            updateTextContent('umbs-6-0-shadow-open', data.UMBS_6_0_Shadow_Open);
            updateTextContent('gnma-5-5-shadow-open', data.GNMA_5_5_Shadow_Open);
            updateTextContent('gnma-6-0-shadow-open', data.GNMA_6_0_Shadow_Open);

        } else {
            console.error('Error fetching MBS data:', data.error);
            document.querySelectorAll('.data-card .main-value, .data-card .detail-value').forEach(el => {
                // Only update elements that belong to MBS/derived data, not the main US10Y current or its timestamp
                if (!el.id.startsWith('us10y-value') && !el.id.startsWith('us10y-timestamp')) {
                    el.textContent = 'Error loading data';
                }
            });
            updateTextContent('mbs-timestamp', 'MBS Data Last updated: Error');
        }
    } catch (error) {
        console.error('Network error fetching MBS data:', error);
        document.querySelectorAll('.data-card .main-value, .data-card .detail-value').forEach(el => {
            if (!el.id.startsWith('us10y-value') && !el.id.startsWith('us10y-timestamp')) {
                el.textContent = 'Network error';
            }
        });
        updateTextContent('mbs-timestamp', 'MBS Data Last updated: Network error');
    }
}

// Function to fetch and update US10Y Current data
async function fetchUS10YData() {
    try {
        const response = await fetch('/.netlify/functions/getUS10YData'); // New function endpoint
        const data = await response.json();

        if (response.ok) {
            // Update US10Y Current Value
            updateTextContent('us10y-value', data.US10Y_Current);
            // Update US10Y Current Timestamp
            updateTextContent('us10y-timestamp', `Last updated: ${data.timestamp_us10y}`);
            // If you add US30Y back to index.html, update it here:
            // updateTextContent('us30y-value', data.US30Y_Current);
            // updateTextContent('us30y-timestamp', `Last updated: ${data.timestamp_us10y}`);
        } else {
            console.error('Error fetching US10Y data:', data.error);
            updateTextContent('us10y-value', 'Error');
            updateTextContent('us10y-timestamp', 'Last updated: Error');
            // updateTextContent('us30y-value', 'Error');
            // updateTextContent('us30y-timestamp', 'Last updated: Error');
        }
    } catch (error) {
        console.error('Network error fetching US10Y data:', error);
        updateTextContent('us10y-value', 'Network error');
        updateTextContent('us10y-timestamp', 'Last updated: Network error');
        // updateTextContent('us30y-value', 'Network error');
        // updateTextContent('us30y-timestamp', 'Last updated: Network error');
    }
}


// Fetch data initially when the page loads
fetchMBSData();
fetchUS10YData(); // Fetch US10Y data immediately

// Refresh data every 2 minutes (120000 milliseconds) for both sets
setInterval(fetchMBSData, 120000);
setInterval(fetchUS10YData, 120000); // Separate interval for US10Y current data if you want different refresh rates, or use the same interval.

// If you want different refresh rates, e.g., US10Y every 30 seconds:
// setInterval(fetchUS10YData, 30000);
// setInterval(fetchMBSData, 120000);
