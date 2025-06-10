// Helper function to format timestamps nicely
function formatTimestamp(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
        timeZone: 'America/Phoenix' // MST (Phoenix, Arizona doesn't observe DST)
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
}

// Helper function to format dates from FRED API (YYYY-MM-DD)
function formatFredDate(dateString) {
    if (!dateString) return '--';
    // FRED dates are YYYY-MM-DD, just reformat for display if needed or use as is
    return dateString;
}

// Helper function to apply color to change values
function applyChangeColor(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.classList.remove('text-green-600', 'text-red-600'); // Remove existing colors

    const dataType = element.getAttribute('data-type');
    const numericValue = parseFloat(value);

    if (isNaN(numericValue)) {
        element.textContent = '--';
        return;
    }

    let formattedValue = numericValue.toFixed(3); // Default for US10Y
    if (elementId.includes('shadow') || elementId.includes('umbs') || elementId.includes('gnma')) {
        formattedValue = numericValue.toFixed(2); // For Shadow Bonds and MBS Products
    }


    if (dataType === 'positive-green-negative-red') {
        if (numericValue > 0) {
            element.classList.add('text-green-600');
            element.textContent = `+${formattedValue}`;
        } else if (numericValue < 0) {
            element.classList.add('text-red-600');
            element.textContent = formattedValue;
        } else {
            element.textContent = formattedValue;
        }
    } else { // Default to positive-red-negative-green (like implied for US10Y previously)
        if (numericValue > 0) {
            element.classList.add('text-red-600'); // Red for positive (opposite for US10Y)
            element.textContent = `+${formattedValue}`;
        } else if (numericValue < 0) {
            element.classList.add('text-green-600'); // Green for negative (opposite for US10Y)
            element.textContent = formattedValue;
        } else {
            element.textContent = formattedValue;
        }
    }
}


// --- Firestore Data Fetching Functions ---

async function fetchMBSData() {
    try {
        const response = await fetch('/.netlify/functions/getMBSData'); // Replace with your actual Netlify Function endpoint
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('umbs-5-5-current').textContent = data.UMBS_5_5_Shadow_Current || '--';
            applyChangeColor('umbs-5-5-change', data.UMBS_5_5_Shadow_Daily_Change);
            document.getElementById('umbs-5-5-open').textContent = data.UMBS_5_5_Shadow_Open || '--';
            document.getElementById('umbs-5-5-today-close').textContent = data.UMBS_5_5_Shadow_Close || '--';
            document.getElementById('umbs-5-5-prior-close').textContent = data.UMBS_5_5_Shadow_PriorDayClose || '--';
            document.getElementById('umbs-5-5-high').textContent = data.UMBS_5_5_Shadow_TodayHigh || '--';
            document.getElementById('umbs-5-5-low').textContent = data.UMBS_5_5_Shadow_TodayLow || '--';

            document.getElementById('umbs-6-0-current').textContent = data.UMBS_6_0_Shadow_Current || '--';
            applyChangeColor('umbs-6-0-change', data.UMBS_6_0_Shadow_Daily_Change);
            document.getElementById('umbs-6-0-open').textContent = data.UMBS_6_0_Shadow_Open || '--';
            document.getElementById('umbs-6-0-today-close').textContent = data.UMBS_6_0_Shadow_Close || '--';
            document.getElementById('umbs-6-0-prior-close').textContent = data.UMBS_6_0_Shadow_PriorDayClose || '--';
            document.getElementById('umbs-6-0-high').textContent = data.UMBS_6_0_Shadow_TodayHigh || '--';
            document.getElementById('umbs-6-0-low').textContent = data.UMBS_6_0_Shadow_TodayLow || '--';

            document.getElementById('gnma-5-5-current').textContent = data.GNMA_5_5_Shadow_Current || '--';
            applyChangeColor('gnma-5-5-change', data.GNMA_5_5_Shadow_Daily_Change);
            document.getElementById('gnma-5-5-open').textContent = data.GNMA_5_5_Shadow_Open || '--';
            document.getElementById('gnma-5-5-today-close').textContent = data.GNMA_5_5_Shadow_Close || '--';
            document.getElementById('gnma-5-5-prior-close').textContent = data.GNMA_5_5_Shadow_PriorDayClose || '--';
            document.getElementById('gnma-5-5-high').textContent = data.GNMA_5_5_Shadow_TodayHigh || '--';
            document.getElementById('gnma-5-5-low').textContent = data.GNMA_5_5_Shadow_TodayLow || '--';

            document.getElementById('gnma-6-0-current').textContent = data.GNMA_6_0_Shadow_Current || '--';
            applyChangeColor('gnma-6-0-change', data.GNMA_6_0_Shadow_Daily_Change);
            document.getElementById('gnma-6-0-open').textContent = data.GNMA_6_0_Shadow_Open || '--';
            document.getElementById('gnma-6-0-today-close').textContent = data.GNMA_6_0_Shadow_Close || '--';
            document.getElementById('gnma-6-0-prior-close').textContent = data.GNMA_6_0_Shadow_PriorDayClose || '--';
            document.getElementById('gnma-6-0-high').textContent = data.GNMA_6_0_Shadow_TodayHigh || '--';
            document.getElementById('gnma-6-0-low').textContent = data.GNMA_6_0_Shadow_TodayLow || '--';

            document.getElementById('mbs-timestamp').textContent = formatTimestamp(data.last_updated);
        } else {
            console.error('Error fetching MBS data:', data.message || response.statusText);
            // Fallback to displaying error message in timestamps
            document.getElementById('mbs-timestamp').textContent = 'Error loading data';
        }
    } catch (error) {
        console.error('Network or parsing error fetching MBS data:', error);
        document.getElementById('mbs-timestamp').textContent = 'Error loading data';
    }
}

async function fetchShadowBondsData() {
    try {
        const response = await fetch('/.netlify/functions/getShadowBondsData'); // Replace with your actual Netlify Function endpoint
        const data = await response.json();

        if (response.ok) {
            document.getElementById('umbs-5-5-shadow-current').textContent = data.UMBS_5_5_Shadow_Current || '--';
            applyChangeColor('umbs-5-5-shadow-change', data.UMBS_5_5_Shadow_Daily_Change);
            document.getElementById('umbs-5-5-shadow-open').textContent = data.UMBS_5_5_Shadow_Open || '--';
            document.getElementById('umbs-5-5-shadow-today-close').textContent = data.UMBS_5_5_Shadow_Close || '--';
            document.getElementById('umbs-5-5-shadow-prior-close').textContent = data.UMBS_5_5_Shadow_PriorDayClose || '--';
            document.getElementById('umbs-5-5-shadow-high').textContent = data.UMBS_5_5_Shadow_TodayHigh || '--';
            document.getElementById('umbs-5-5-shadow-low').textContent = data.UMBS_5_5_Shadow_TodayLow || '--';

            document.getElementById('umbs-6-0-shadow-current').textContent = data.UMBS_6_0_Shadow_Current || '--';
            applyChangeColor('umbs-6-0-shadow-change', data.UMBS_6_0_Shadow_Daily_Change);
            document.getElementById('umbs-6-0-shadow-open').textContent = data.UMBS_6_0_Shadow_Open || '--';
            document.getElementById('umbs-6-0-shadow-today-close').textContent = data.UMBS_6_0_Shadow_Close || '--';
            document.getElementById('umbs-6-0-prior-close').textContent = data.UMBS_6_0_Shadow_PriorDayClose || '--';
            document.getElementById('umbs-6-0-high').textContent = data.UMBS_6_0_Shadow_TodayHigh || '--';
            document.getElementById('umbs-6-0-low').textContent = data.UMBS_6_0_Shadow_TodayLow || '--';

            document.getElementById('gnma-5-5-shadow-current').textContent = data.GNMA_5_5_Shadow_Current || '--';
            applyChangeColor('gnma-5-5-shadow-change', data.GNMA_5_5_Shadow_Daily_Change);
            document.getElementById('gnma-5-5-shadow-open').textContent = data.GNMA_5_5_Shadow_Open || '--';
            document.getElementById('gnma-5-5-shadow-today-close').textContent = data.GNMA_5_5_Shadow_Close || '--';
            document.getElementById('gnma-5-5-shadow-prior-close').textContent = data.GNMA_5_5_Shadow_PriorDayClose || '--';
            document.getElementById('gnma-5-5-shadow-high').textContent = data.GNMA_5_5_Shadow_TodayHigh || '--';
            document.getElementById('gnma-5-5-shadow-low').textContent = data.GNMA_5_5_Shadow_TodayLow || '--';

            document.getElementById('gnma-6-0-shadow-current').textContent = data.GNMA_6_0_Shadow_Current || '--';
            applyChangeColor('gnma-6-0-shadow-change', data.GNMA_6_0_Shadow_Daily_Change);
            document.getElementById('gnma-6-0-shadow-open').textContent = data.GNMA_6_0_Shadow_Open || '--';
            document.getElementById('gnma-6-0-today-close').textContent = data.GNMA_6_0_Shadow_Close || '--';
            document.getElementById('gnma-6-0-prior-close').textContent = data.GNMA_6_0_Shadow_PriorDayClose || '--';
            document.getElementById('gnma-6-0-high').textContent = data.GNMA_6_0_Shadow_TodayHigh || '--';
            document.getElementById('gnma-6-0-low').textContent = data.GNMA_6_0_Shadow_TodayLow || '--';
            
            document.getElementById('shadow-timestamp').textContent = formatTimestamp(data.last_updated);

        } else {
            console.error('Error fetching Shadow Bonds data:', data.message || response.statusText);
            document.getElementById('shadow-timestamp').textContent = 'Error loading data';
        }
    } catch (error) {
        console.error('Network or parsing error fetching Shadow Bonds data:', error);
        document.getElementById('shadow-timestamp').textContent = 'Error loading data';
    }
}

async function fetchUS10YData() {
    try {
        const response = await fetch('/.netlify/functions/getUS10YData'); // Replace with your actual Netlify Function endpoint
        const data = await response.json();

        if (response.ok) {
            document.getElementById('us10y-current').textContent = data.US10Y_Current || '--';
            applyChangeColor('us10y-change', data.US10Y_Daily_Change);
            document.getElementById('us10y-open').textContent = data.US10Y_Open || '--';
            document.getElementById('us10y-today-close').textContent = data.US10Y_Close || '--';
            document.getElementById('us10y-prior-close').textContent = data.US10Y_PriorDayClose || '--';
            document.getElementById('us10y-high').textContent = data.US10Y_TodayHigh || '--';
            document.getElementById('us10y-low').textContent = data.US10Y_TodayLow || '--';
            
            document.getElementById('us10y-timestamp').textContent = formatTimestamp(data.last_updated);
        } else {
            console.error('Error fetching US10Y data:', data.message || response.statusText);
            document.getElementById('us10y-timestamp').textContent = 'Error loading data';
        }
    } catch (error) {
        console.error('Network or parsing error fetching US10Y data:', error);
        document.getElementById('us10y-timestamp').textContent = 'Error loading data';
    }
}

// --- NEW: FRED Data Fetching Functions ---

async function fetchFredMortgage30US() {
    console.log("Fetching FRED Mortgage30US data...");
    try {
        const response = await fetch('/.netlify/functions/getMortgage30US');
        const data = await response.json();
        if (response.ok) {
            document.getElementById('fred-mortgage30us-value').textContent = parseFloat(data.value).toFixed(2) + '%';
            document.getElementById('fred-mortgage30us-date').textContent = formatFredDate(data.date);
            document.getElementById('fred-timestamp').textContent = formatTimestamp(new Date().toISOString()); // Update FRED timestamp
            console.log("FRED Mortgage30US data updated.");
        } else {
            console.error("Failed to fetch FRED Mortgage30US:", data.message);
            document.getElementById('fred-mortgage30us-value').textContent = 'Error';
            document.getElementById('fred-timestamp').textContent = 'Error loading data';
        }
    } catch (error) {
        console.error("Error calling Netlify Function for FRED Mortgage30US:", error);
        document.getElementById('fred-mortgage30us-value').textContent = 'Error';
        document.getElementById('fred-timestamp').textContent = 'Error loading data';
    }
}

async function fetchFredRetailSales() {
    console.log("Fetching FRED RetailSales data...");
    try {
        const response = await fetch('/.netlify/functions/getRetailSales');
        const data = await response.json();
        if (response.ok) {
            document.getElementById('fred-retailsales-value').textContent = parseFloat(data.value).toFixed(2);
            document.getElementById('fred-retailsales-date').textContent = formatFredDate(data.date);
            document.getElementById('fred-timestamp').textContent = formatTimestamp(new Date().toISOString()); // Update FRED timestamp
            console.log("FRED RetailSales data updated.");
        } else {
            console.error("Failed to fetch FRED RetailSales:", data.message);
            document.getElementById('fred-retailsales-value').textContent = 'Error';
            document.getElementById('fred-timestamp').textContent = 'Error loading data';
        }
    } catch (error) {
        console.error("Error calling Netlify Function for FRED RetailSales:", error);
        document.getElementById('fred-retailsales-value').textContent = 'Error';
        document.getElementById('fred-timestamp').textContent = 'Error loading data';
    }
}

async function fetchFredConsumerSentiment() {
    console.log("Fetching FRED ConsumerSentiment data...");
    try {
        const response = await fetch('/.netlify/functions/getConsumerSentiment');
        const data = await response.json();
        if (response.ok) {
            document.getElementById('fred-consumersentiment-value').textContent = parseFloat(data.value).toFixed(2);
            document.getElementById('fred-consumersentiment-date').textContent = formatFredDate(data.date);
            document.getElementById('fred-timestamp').textContent = formatTimestamp(new Date().toISOString()); // Update FRED timestamp
            console.log("FRED ConsumerSentiment data updated.");
        } else {
            console.error("Failed to fetch FRED ConsumerSentiment:", data.message);
            document.getElementById('fred-consumersentiment-value').textContent = 'Error';
            document.getElementById('fred-timestamp').textContent = 'Error loading data';
        }
    } catch (error) {
        console.error("Error calling Netlify Function for FRED ConsumerSentiment:", error);
        document.getElementById('fred-consumersentiment-value').textContent = 'Error';
        document.getElementById('fred-timestamp').textContent = 'Error loading data';
    }
}

// Function to update the overall last updated timestamp in the header
function updateOverallTimestamp() {
    console.log("Updating overall timestamp...");
    const overallTimestampElement = document.getElementById('last-updated-overall');
    if (overallTimestampElement) {
        overallTimestampElement.textContent = `Last Refreshed: ${formatTimestamp(new Date().toISOString())}`;
        console.log("Overall timestamp updated.");
    }
}

// Initial data fetch on page load and set up refresh intervals
document.addEventListener('DOMContentLoaded', () => {
    // Initial fetches for all sections
    fetchMBSData();
    fetchShadowBondsData();
    fetchUS10YData();
    fetchFredMortgage30US();
    fetchFredRetailSales();
    fetchFredConsumerSentiment();
    updateOverallTimestamp(); // Update immediately on load

    // Set up refresh intervals
    // Market data (MBS, Shadow, US10Y) updates more frequently
    setInterval(fetchMBSData, 5 * 60 * 1000); // 5 minutes
    setInterval(fetchShadowBondsData, 5 * 60 * 1000); // 5 minutes
    setInterval(fetchUS10YData, 5 * 60 * 1000); // 5 minutes

    // FRED data updates less frequently, so longer intervals are fine
    setInterval(fetchFredMortgage30US, 60 * 60 * 1000); // Every hour
    setInterval(fetchFredRetailSales, 60 * 60 * 1000); // Every hour
    setInterval(fetchFredConsumerSentiment, 60 * 60 * 1000); // Every hour

    // Overall timestamp updates more frequently to show activity
    setInterval(updateOverallTimestamp, 60 * 1000); // Every 1 minute
});
