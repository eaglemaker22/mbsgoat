// Helper function to format timestamps nicely
function formatTimestamp(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
        console.warn("Invalid date string for formatting:", isoString);
        return '--'; // Handle cases where date parsing fails
    }
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
    // FRED dates are YYYY-MM-DD, so we can just return as is
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

    let formattedValue;
    // Determine decimal places based on element ID
    if (elementId.includes('us10y')) {
        formattedValue = numericValue.toFixed(3);
    } else { // For MBS and Shadow Bonds
        formattedValue = numericValue.toFixed(2);
    }

    // Add '+' sign for positive values, toFixed handles '-' for negative
    if (numericValue > 0) {
        formattedValue = `+${formattedValue}`;
    }

    element.textContent = formattedValue; // Assign the correctly formatted string

    // Apply colors based on data-type attribute
    if (dataType === 'positive-green-negative-red') {
        if (numericValue > 0) {
            element.classList.add('text-green-600');
        } else if (numericValue < 0) {
            element.classList.add('text-red-600');
        } else {
            element.classList.add('text-gray-700'); // Neutral color for zero change
        }
    } else if (dataType === 'positive-red-negative-green') {
        // This type is used for US10Y change, where positive is red and negative is green
        if (numericValue > 0) {
            element.classList.add('text-red-600');
        } else if (numericValue < 0) {
            element.classList.add('text-green-600');
        } else {
            element.classList.add('text-gray-700'); // Neutral color for zero change
        }
    } else {
        element.classList.add('text-gray-700'); // Default color if data-type is not specified or recognized
    }
}

// Helper function to format general numeric values
function formatNumericValue(value, decimals) {
    const numValue = parseFloat(value);
    // If numValue is NaN, return '--'. Otherwise, format to fixed decimals.
    return isNaN(numValue) ? '--' : numValue.toFixed(decimals);
}

// Fetch MBS Products Data
async function fetchMBSData() {
    try {
        const response = await fetch('/.netlify/functions/getMBSData');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        const products = [
            { id: 'umbs-5-5', prefix: 'UMBS_5_5' },
            { id: 'umbs-6-0', prefix: 'UMBS_6_0' },
            { id: 'gnma-5-5', prefix: 'GNMA_5_5' },
            { id: 'gnma-6-0', prefix: 'GNMA_6_0' }
        ];

        products.forEach(product => {
            const currentElem = document.getElementById(`${product.id}-current`);
            const changeElem = document.getElementById(`${product.id}-change`);
            const openElem = document.getElementById(`${product.id}-open`);
            const todayCloseElem = document.getElementById(`${product.id}-today-close`);
            const priorCloseElem = document.getElementById(`${product.id}-prior-close`);
            const highElem = document.getElementById(`${product.id}-high`);
            const lowElem = document.getElementById(`${product.id}-low`);

            const current = formatNumericValue(data[`${product.prefix}_Current`], 2); // 2 decimal places
            const change = data[`${product.prefix}_Daily_Change`];
            const open = formatNumericValue(data[`${product.prefix}_Open`], 2); // 2 decimal places
            const todayClose = formatNumericValue(data[`${product.prefix}_Close`], 2); // 2 decimal places
            const priorClose = formatNumericValue(data[`${product.prefix}_PriorDayClose`], 2);
            const high = formatNumericValue(data[`${product.prefix}_TodayHigh`], 2);
            const low = formatNumericValue(data[`${product.prefix}_TodayLow`], 2);

            if (currentElem) currentElem.textContent = current;
            if (openElem) openElem.textContent = open;
            if (todayCloseElem) todayCloseElem.textContent = todayClose;
            if (priorCloseElem) priorCloseElem.textContent = priorClose;
            if (highElem) highElem.textContent = high;
            if (lowElem) lowElem.textContent = low;
            if (changeElem) applyChangeColor(changeElem.id, change); // Pass element ID

        });

        const timestampElem = document.getElementById('mbs-timestamp');
        if (timestampElem) {
            timestampElem.textContent = formatTimestamp(data.last_updated);
        }

    } catch (error) {
        console.error('Error fetching MBS data:', error);
        document.getElementById('mbs-timestamp').textContent = 'Error loading data';
        const products = [
            { id: 'umbs-5-5' }, { id: 'umbs-6-0' },
            { id: 'gnma-5-5' }, { id: 'gnma-6-0' }
        ];
        products.forEach(product => {
            ['current', 'change', 'open', 'today-close', 'prior-close', 'high', 'low'].forEach(suffix => {
                const element = document.getElementById(`${product.id}-${suffix}`);
                if (element) element.textContent = '--';
            });
        });
    }
}

// Fetch Shadow Bonds Data
async function fetchShadowBondsData() {
    try {
        const response = await fetch('/.netlify/functions/getShadowBondsData');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        const products = [
            { id: 'umbs-5-5-shadow', prefix: 'UMBS_5_5_Shadow' },
            { id: 'umbs-6-0-shadow', prefix: 'UMBS_6_0_Shadow' },
            { id: 'gnma-5-5-shadow', prefix: 'GNMA_5_5_Shadow' },
            { id: 'gnma-6-0-shadow', prefix: 'GNMA_6_0_Shadow' }
        ];

        products.forEach(product => {
            const currentElem = document.getElementById(`${product.id}-current`);
            const changeElem = document.getElementById(`${product.id}-change`);
            const openElem = document.getElementById(`${product.id}-open`);
            const todayCloseElem = document.getElementById(`${product.id}-today-close`);
            const priorCloseElem = document.getElementById(`${product.id}-prior-close`);
            const highElem = document.getElementById(`${product.id}-high`);
            const lowElem = document.getElementById(`${product.id}-low`);

            const current = formatNumericValue(data[`${product.prefix}_Current`], 2);
            const change = data[`${product.prefix}_Daily_Change`];
            const open = formatNumericValue(data[`${product.prefix}_Open`], 2);
            const todayClose = formatNumericValue(data[`${product.prefix}_Close`], 2);
            const priorClose = formatNumericValue(data[`${product.prefix}_PriorDayClose`], 2);
            const high = formatNumericValue(data[`${product.prefix}_TodayHigh`], 2);
            const low = formatNumericValue(data[`${product.prefix}_TodayLow`], 2);

            if (currentElem) currentElem.textContent = current;
            if (openElem) openElem.textContent = open;
            if (todayCloseElem) todayCloseElem.textContent = todayClose;
            if (priorCloseElem) priorCloseElem.textContent = priorClose;
            if (highElem) highElem.textContent = high;
            if (lowElem) lowElem.textContent = low;
            if (changeElem) applyChangeColor(changeElem.id, change);
        });

        const timestampElem = document.getElementById('shadow-timestamp');
        if (timestampElem) {
            timestampElem.textContent = formatTimestamp(data.last_updated);
        }

    } catch (error) {
        console.error('Error fetching Shadow Bonds data:', error);
        document.getElementById('shadow-timestamp').textContent = 'Error loading data';
        const products = [
            { id: 'umbs-5-5-shadow' }, { id: 'umbs-6-0-shadow' },
            { id: 'gnma-5-5-shadow' }, { id: 'gnma-6-0-shadow' }
        ];
        products.forEach(product => {
            ['current', 'change', 'open', 'today-close', 'prior-close', 'high', 'low'].forEach(suffix => {
                const element = document.getElementById(`${product.id}-${suffix}`);
                if (element) element.textContent = '--';
            });
        });
    }
}

// Fetch US 10-Year Treasury Yield Data
async function fetchUS10YData() {
    try {
        const response = await fetch('/.netlify/functions/getUS10YData');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        const currentElem = document.getElementById('us10y-current');
        const changeElem = document.getElementById('us10y-change');
        const openElem = document.getElementById('us10y-open');
        const todayCloseElem = document.getElementById('us10y-today-close');
        const priorCloseElem = document.getElementById('us10y-prior-close');
        const highElem = document.getElementById('us10y-high');
        const lowElem = document.getElementById('us10y-low');
        const timestampElem = document.getElementById('us10y-timestamp');

        const current = formatNumericValue(data.US10Y_Current, 3);
        const change = data.US10Y_Daily_Change;
        const open = formatNumericValue(data.US10Y_Open, 3);
        const todayClose = formatNumericValue(data.US10Y_Close, 3);
        const priorClose = formatNumericValue(data.US10Y_PriorDayClose, 3);
        const high = formatNumericValue(data.US10Y_TodayHigh, 3);
        const low = formatNumericValue(data.US10Y_TodayLow, 3);

        if (currentElem) currentElem.textContent = current;
        if (openElem) openElem.textContent = open;
        if (todayCloseElem) todayCloseElem.textContent = todayClose;
        if (priorCloseElem) priorCloseElem.textContent = priorClose;
        if (highElem) highElem.textContent = high;
        if (lowElem) lowElem.textContent = low;

        if (changeElem) applyChangeColor(changeElem.id, change);

        if (timestampElem) {
            timestampElem.textContent = formatTimestamp(data.last_updated);
        }

    } catch (error) {
        console.error('Error fetching US 10-Year Treasury Yield data:', error);
        document.getElementById('us10y-timestamp').textContent = 'Error loading data';
        ['us10y-current', 'us10y-change', 'us10y-open', 'us10y-today-close', 'us10y-prior-close', 'us10y-high', 'us10y-low'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '--';
        });
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
