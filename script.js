// Helper function to format timestamps
function formatTimestamp(isoString) {
    if (!isoString) return '--';
    // If the string is in 'YYYY-MM-DD HH:MM:SS' format, convert it to ISO for Date parsing
    if (typeof isoString === 'string' && isoString.includes(' ') && !isoString.includes('T')) {
        isoString = isoString.replace(' ', 'T');
    }
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
        console.warn("Invalid date string for formatting:", isoString);
        return '--'; // Handle cases where date parsing fails
    }
    // Use Intl.DateTimeFormat for robust time zone and formatting
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

// Helper function to apply color based on change
function applyChangeColor(element, value, dataType) {
    // Ensure value is a number for comparison, fallback to '--' if not valid
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
        element.textContent = '--';
        element.classList.remove('text-green-600', 'text-red-600');
        element.classList.add('text-gray-700');
        return;
    }

    element.textContent = numValue > 0 ? `+${value}` : value.toString(); // Add '+' for positive, keep sign for negative
    element.classList.remove('text-green-600', 'text-red-600', 'text-gray-700'); // Remove previous colors

    if (dataType === 'positive-red-negative-green') {
        if (numValue > 0) {
            element.classList.add('text-red-600');
        } else if (numValue < 0) {
            element.classList.add('text-green-600');
        } else {
            element.classList.add('text-gray-700');
        }
    } else if (dataType === 'positive-green-negative-red') {
        if (numValue > 0) {
            element.classList.add('text-green-600');
        } else if (numValue < 0) {
            element.classList.add('text-red-600');
        } else {
            element.classList.add('text-gray-700');
        }
    } else {
        element.classList.add('text-gray-700'); // Default color if data-type is not specified or recognized
    }
}


// Fetch MBS Products Data
async function fetchMBSData() {
    try {
        const response = await fetch('/.netlify/functions/getMBSData');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Updated prefixes to match Netlify function log exact keys from prior logs
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

            const current = data[`${product.prefix}_Current`];
            const change = data[`${product.prefix}_Daily_Change`];
            const open = data[`${product.prefix}_Open`];
            const todayClose = data[`${product.prefix}_Close`];

            // Check for presence of these keys in the received data.
            // If they are not in the Netlify function's response, they will be '--'.
            const priorClose = data[`${product.prefix}_PriorDayClose`] !== undefined ? data[`${product.prefix}_PriorDayClose`] : '--';
            const high = data[`${product.prefix}_TodayHigh`] !== undefined ? data[`${product.prefix}_TodayHigh`] : '--';
            const low = data[`${product.prefix}_TodayLow`] !== undefined ? data[`${product.prefix}_TodayLow`] : '--';

            // Log values for debugging
            console.log(`MBS ${product.id}:`, { current, change, open, todayClose, priorClose, high, low });


            if (currentElem) currentElem.textContent = current !== null ? current : '--';
            if (openElem) openElem.textContent = open !== null ? open : '--';
            if (todayCloseElem) todayCloseElem.textContent = todayClose !== null ? todayClose : '--';
            if (priorCloseElem) priorCloseElem.textContent = priorClose;
            if (highElem) highElem.textContent = high;
            if (lowElem) lowElem.textContent = low;
            if (changeElem) {
                applyChangeColor(changeElem, change, changeElem.dataset.type);
            }
        });

        const timestampElem = document.getElementById('mbs-timestamp');
        if (timestampElem) {
            timestampElem.textContent = formatTimestamp(data.last_updated); // Changed to data.last_updated
        }

    } catch (error) {
        console.error('Error fetching MBS data:', error);
        document.getElementById('mbs-timestamp').textContent = 'Error loading data';
        // Also clear other MBS fields on error
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

// Fetch Shadow Bonds Data (Assuming similar data structure as MBS)
async function fetchShadowBondsData() {
    try {
        const response = await fetch('/.netlify/functions/getShadowBondsData');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Assuming similar key structure for Shadow Bonds based on prior logs
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

            const current = data[`${product.prefix}_Current`];
            const change = data[`${product.prefix}_Daily_Change`];
            const open = data[`${product.prefix}_Open`];
            const todayClose = data[`${product.prefix}_Close`];

            // Check for presence of these keys in the received data.
            const priorClose = data[`${product.prefix}_PriorDayClose`] !== undefined ? data[`${product.prefix}_PriorDayClose`] : '--';
            const high = data[`${product.prefix}_TodayHigh`] !== undefined ? data[`${product.prefix}_TodayHigh`] : '--';
            const low = data[`${product.prefix}_TodayLow`] !== undefined ? data[`${product.prefix}_TodayLow`] : '--';

            // Log values for debugging
            console.log(`Shadow Bonds ${product.id}:`, { current, change, open, todayClose, priorClose, high, low });


            if (currentElem) currentElem.textContent = current !== null ? current : '--';
            if (openElem) openElem.textContent = open !== null ? open : '--';
            if (todayCloseElem) todayCloseElem.textContent = todayClose !== null ? todayClose : '--';
            if (priorCloseElem) priorCloseElem.textContent = priorClose;
            if (highElem) highElem.textContent = high;
            if (lowElem) lowElem.textContent = low;
            if (changeElem) {
                applyChangeColor(changeElem, change, changeElem.dataset.type);
            }
        });

        const timestampElem = document.getElementById('shadow-timestamp');
        if (timestampElem) {
            timestampElem.textContent = formatTimestamp(data.last_updated); // Changed to data.last_updated
        }

    } catch (error) {
        console.error('Error fetching Shadow Bonds data:', error);
        document.getElementById('shadow-timestamp').textContent = 'Error loading data';
        // Also clear other Shadow Bonds fields on error
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

// Fetch US 10-Year Treasury Yield Data (Assuming similar data structure)
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

        // Assuming keys like US10Y_Current, US10Y_Daily_Change, US10Y_Open, US10Y_Close etc.
        const current = data.US10Y_Current;
        const change = data.US10Y_Daily_Change;
        const open = data.US10Y_Open;
        const todayClose = data.US10Y_Close;

        // Check for presence of these keys in the received data.
        const priorClose = data.US10Y_PriorDayClose !== undefined ? data.US10Y_PriorDayClose : '--';
        const high = data.US10Y_TodayHigh !== undefined ? data.US10Y_TodayHigh : '--';
        const low = data.US10Y_TodayLow !== undefined ? data.US10Y_TodayLow : '--';

        // Log values for debugging
        console.log(`US 10Y:`, { current, change, open, todayClose, priorClose, high, low });

        if (currentElem) currentElem.textContent = current !== null ? current : '--';
        if (openElem) openElem.textContent = open !== null ? open : '--';
        if (todayCloseElem) todayCloseElem.textContent = todayClose !== null ? todayClose : '--';
        if (priorCloseElem) priorCloseElem.textContent = priorClose;
        if (highElem) highElem.textContent = high;
        if (lowElem) lowElem.textContent = low;

        if (changeElem) {
            applyChangeColor(changeElem, change, changeElem.dataset.type);
        }

        if (timestampElem) {
            timestampElem.textContent = formatTimestamp(data.last_updated); // Changed to data.last_updated
        }

    } catch (error) {
        console.error('Error fetching US 10-Year Treasury Yield data:', error);
        document.getElementById('us10y-timestamp').textContent = 'Error loading data';
        // Also clear other US10Y fields on error
        ['us10y-current', 'us10y-change', 'us10y-open', 'us10y-today-close', 'us10y-prior-close', 'us10y-high', 'us10y-low'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '--';
        });
    }
}


// Update the overall last updated timestamp (local browser time)
async function updateOverallTimestamp() {
    // This could be updated to reflect the latest timestamp from any of the fetched data,
    // or from a dedicated API endpoint for a global last update time.
    // For now, it will update after all initial fetches are done.
    const lastUpdatedOverallElem = document.getElementById('last-updated-overall');
    if (lastUpdatedOverallElem) {
        lastUpdatedOverallElem.textContent = `Last Updated: ${formatTimestamp(new Date().toISOString())}`;
    }
}

// Initial data fetch on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchMBSData();
    fetchShadowBondsData();
    fetchUS10YData();
    // fetchMortgageRatesData(); // Removed as per request for static mortgage rates

    // Set up refresh interval (e.g., every 5 minutes for MBS, Shadow, US10Y)
    setInterval(fetchMBSData, 5 * 60 * 1000); // 5 minutes
    setInterval(fetchShadowBondsData, 5 * 60 * 1000); // 5 minutes
    setInterval(fetchUS10YData, 5 * 60 * 1000); // 5 minutes
    // setInterval(fetchMortgageRatesData, 10 * 60 * 1000); // Removed as per request
});

// Call updateOverallTimestamp after all fetches are done (or on an interval)
// For simplicity, let's call it after the initial DOMContentLoaded fetches
document.addEventListener('DOMContentLoaded', updateOverallTimestamp);
// And then periodically, perhaps less frequently than individual data fetches
setInterval(updateOverallTimestamp, 60 * 1000); // Every 1 minute
