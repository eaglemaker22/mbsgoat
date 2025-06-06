// Helper function to format timestamps
function formatTimestamp(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    // Use Intl.DateTimeFormat for robust time zone and formatting
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
        timeZone: 'America/Phoenix' // MST
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
}

// Helper function to apply color based on change
function applyChangeColor(element, value, dataType) {
    element.textContent = value !== null ? (value > 0 ? `+${value}` : value.toString()) : '--';
    element.classList.remove('text-green-600', 'text-red-600', 'text-gray-700'); // Remove previous colors

    if (dataType === 'positive-red-negative-green') {
        if (value > 0) {
            element.classList.add('text-red-600');
        } else if (value < 0) {
            element.classList.add('text-green-600');
        } else {
            element.classList.add('text-gray-700');
        }
    } else if (dataType === 'positive-green-negative-red') {
        if (value > 0) {
            element.classList.add('text-green-600');
        } else if (value < 0) {
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

        const products = [
            { id: 'umbs-5-5', prefix: 'UMBS55' },
            { id: 'umbs-6-0', prefix: 'UMBS60' },
            { id: 'gnma-5-5', prefix: 'GNMA55' },
            { id: 'gnma-6-0', prefix: 'GNMA60' }
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
            const change = data[`${product.prefix}_Change`];
            const open = data[`${product.prefix}_Open`];
            const todayClose = data[`${product.prefix}_Close`];
            const priorClose = data[`${product.prefix}_PriorDayClose`];
            const high = data[`${product.prefix}_TodayHigh`];
            const low = data[`${product.prefix}_TodayLow`];

            if (currentElem) currentElem.textContent = current !== null ? current : '--';
            if (openElem) openElem.textContent = open !== null ? open : '--';
            if (todayCloseElem) todayCloseElem.textContent = todayClose !== null ? todayClose : '--';
            if (priorCloseElem) priorCloseElem.textContent = priorClose !== null ? priorClose : '--';
            if (highElem) highElem.textContent = high !== null ? high : '--';
            if (lowElem) lowElem.textContent = low !== null ? low : '--';
            if (changeElem) {
                applyChangeColor(changeElem, change, changeElem.dataset.type);
            }
        });

        const timestampElem = document.getElementById('mbs-timestamp');
        if (timestampElem) {
            timestampElem.textContent = formatTimestamp(data.Timestamp);
        }

    } catch (error) {
        console.error('Error fetching MBS data:', error);
        document.getElementById('mbs-timestamp').textContent = 'Error loading data';
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
            { id: 'umbs-5-5-shadow', prefix: 'UMBS55_Shadow' },
            { id: 'umbs-6-0-shadow', prefix: 'UMBS60_Shadow' },
            { id: 'gnma-5-5-shadow', prefix: 'GNMA55_Shadow' },
            { id: 'gnma-6-0-shadow', prefix: 'GNMA60_Shadow' }
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
            const change = data[`${product.prefix}_Change`];
            const open = data[`${product.prefix}_Open`];
            const todayClose = data[`${product.prefix}_Close`];
            const priorClose = data[`${product.prefix}_PriorDayClose`];
            const high = data[`${product.prefix}_TodayHigh`];
            const low = data[`${product.prefix}_TodayLow`];

            if (currentElem) currentElem.textContent = current !== null ? current : '--';
            if (openElem) openElem.textContent = open !== null ? open : '--';
            if (todayCloseElem) todayCloseElem.textContent = todayClose !== null ? todayClose : '--';
            if (priorCloseElem) priorCloseElem.textContent = priorClose !== null ? priorClose : '--';
            if (highElem) highElem.textContent = high !== null ? high : '--';
            if (lowElem) lowElem.textContent = low !== null ? low : '--';
            if (changeElem) {
                applyChangeColor(changeElem, change, changeElem.dataset.type);
            }
        });

        const timestampElem = document.getElementById('shadow-timestamp');
        if (timestampElem) {
            timestampElem.textContent = formatTimestamp(data.Timestamp);
        }

    } catch (error) {
        console.error('Error fetching Shadow Bonds data:', error);
        document.getElementById('shadow-timestamp').textContent = 'Error loading data';
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

        if (currentElem) currentElem.textContent = data.US10Y_Current !== null ? data.US10Y_Current : '--';
        if (openElem) openElem.textContent = data.US10Y_Open !== null ? data.US10Y_Open : '--';
        if (todayCloseElem) todayCloseElem.textContent = data.US10Y_Close !== null ? data.US10Y_Close : '--';
        if (priorCloseElem) priorCloseElem.textContent = data.US10Y_PriorDayClose !== null ? data.US10Y_PriorDayClose : '--';
        if (highElem) highElem.textContent = data.US10Y_TodayHigh !== null ? data.US10Y_TodayHigh : '--';
        if (lowElem) lowElem.textContent = data.US10Y_TodayLow !== null ? data.US10Y_TodayLow : '--';

        if (changeElem) {
            applyChangeColor(changeElem, data.US10Y_Change, changeElem.dataset.type);
        }

        if (timestampElem) {
            timestampElem.textContent = formatTimestamp(data.Timestamp);
        }

    } catch (error) {
        console.error('Error fetching US 10-Year Treasury Yield data:', error);
        document.getElementById('us10y-timestamp').textContent = 'Error loading data';
    }
}

// Initial data fetch on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchMBSData();
    fetchShadowBondsData();
    fetchUS10YData();

    // Set up refresh interval (e.g., every 5 minutes for MBS, Shadow, US10Y)
    setInterval(fetchMBSData, 5 * 60 * 1000); // 5 minutes
    setInterval(fetchShadowBondsData, 5 * 60 * 1000); // 5 minutes
    setInterval(fetchUS10YData, 5 * 60 * 1000); // 5 minutes
});

// Update overall last updated timestamp (could be based on the latest fetch or a separate API)
async function updateOverallTimestamp() {
    // This could be updated to reflect the latest timestamp from any of the fetched data,
    // or from a dedicated API endpoint for a global last update time.
    // For now, it will update after all initial fetches are done.
    const lastUpdatedOverallElem = document.getElementById('last-updated-overall');
    if (lastUpdatedOverallElem) {
        lastUpdatedOverallElem.textContent = `Last Updated: ${formatTimestamp(new Date().toISOString())}`;
    }
}

// Call updateOverallTimestamp after all fetches are done (or on an interval)
// For simplicity, let's call it after the initial DOMContentLoaded fetches
document.addEventListener('DOMContentLoaded', updateOverallTimestamp);
// And then periodically, perhaps less frequently than individual data fetches
setInterval(updateOverallTimestamp, 60 * 1000); // Every 1 minute
