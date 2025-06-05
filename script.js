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
            const todayClose = data[`${product.prefix}_Close`]; // Assuming 'Close' refers to Today Close
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

// Fetch Mortgage Rates Data (updated to build table rows dynamically)
async function fetchMortgageRatesData() {
    try {
        const response = await fetch('/.netlify/functions/getMortgageRatesData'); // Adjust endpoint if needed
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const tableBody = document.getElementById('mortgage-rates-table-body');
        const timestampElem = document.getElementById('mortgage-rates-timestamp');

        if (!tableBody) {
            console.error('Mortgage rates table body element not found!');
            if (timestampElem) timestampElem.textContent = 'Error loading data';
            return;
        }

        // Clear existing rows
        tableBody.innerHTML = '';

        // Example data structure your Netlify function should return:
        // {
        //     "Timestamp": "2025-06-05T14:15:00Z",
        //     "Rates": [
        //         {"product": "Conf 30 Yr Fix", "rate": "6.88%", "apr": "6.95%", "points": "0.5", "pi": "$2,500"},
        //         {"product": "Freddie Mac 30 Yr Fix", "rate": "6.85%", "apr": "6.89%", "points": "0.3", "pi": "$2,490"},
        //         {"product": "Freddie Mac 15 Yr Fix", "rate": "5.99%", "apr": "6.05%", "points": "0.2", "pi": "$3,500"},
        //         {"product": "Fed Funds Rate", "rate": "4.33%", "apr": "N/A", "points": "N/A", "pi": "N/A"},
        //         {"product": "Prime Rate", "rate": "7.50%", "apr": "N/A", "points": "N/A", "pi": "N/A"}
        //     ]
        // }


        if (data.Rates && Array.isArray(data.Rates)) {
            data.Rates.forEach(item => {
                const row = document.createElement('tr');
                row.classList.add('border-b', 'border-gray-100');
                row.innerHTML = `
                    <td class="py-1 px-2 font-semibold text-gray-800">${item.product || '--'}</td>
                    <td class="py-1 px-2 text-gray-700">${item.rate || '--'}</td>
                    <td class="py-1 px-2 text-gray-700">${item.apr || '--'}</td>
                    <td class="py-1 px-2 text-gray-700">${item.points || '--'}</td>
                    <td class="py-1 px-2 text-gray-700">${item.pi || '--'}</td>
                `;
                tableBody.appendChild(row);
            });
        } else {
             // If no data or invalid data, display a message
             const row = document.createElement('tr');
             row.innerHTML = `<td colspan="5" class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">No mortgage rates data available.</td>`;
             tableBody.appendChild(row);
        }

        if (timestampElem) {
            timestampElem.textContent = formatTimestamp(data.Timestamp);
        }

    } catch (error) {
        console.error('Error fetching Mortgage Rates data:', error);
        document.getElementById('mortgage-rates-timestamp').textContent = 'Error loading data';
        const tableBody = document.getElementById('mortgage-rates-table-body');
        if (tableBody) {
             tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 whitespace-nowrap text-center text-sm text-red-500">Failed to load data. Please try again.</td></tr>`;
        }
    }
}


// Initial data fetch on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchMBSData();
    fetchShadowBondsData();
    fetchUS10YData();
    fetchMortgageRatesData();

    // Set up refresh interval (e.g., every 5 minutes for MBS, Shadow, US10Y)
    // You might want a different interval for mortgage rates if it updates less frequently
    setInterval(fetchMBSData, 5 * 60 * 1000); // 5 minutes
    setInterval(fetchShadowBondsData, 5 * 60 * 1000); // 5 minutes
    setInterval(fetchUS10YData, 5 * 60 * 1000); // 5 minutes
    setInterval(fetchMortgageRatesData, 10 * 60 * 1000); // 10 minutes
});

// Update overall last updated timestamp (could be based on the latest fetch or a separate API)
async function updateOverallTimestamp() {
    // This could be updated to reflect the latest timestamp from any of the fetched data,
    // or from a dedicated API endpoint for a global last update time.
    // For now, it will update after all initial fetches are done.
    const lastUpdatedOverallElem = document.getElementById('last-updated-overall');
    if (lastUpdatedOverallElem) {
        // A simple approach: use current time if no specific global timestamp is available
        lastUpdatedOverallElem.textContent = `Last Updated: ${formatTimestamp(new Date().toISOString())}`;
    }
}

// Call updateOverallTimestamp after all fetches are done (or on an interval)
// For simplicity, let's call it after the initial DOMContentLoaded fetches
document.addEventListener('DOMContentLoaded', updateOverallTimestamp);
// And then periodically, perhaps less frequently than individual data fetches
setInterval(updateOverallTimestamp, 60 * 1000); // Every 1 minute
