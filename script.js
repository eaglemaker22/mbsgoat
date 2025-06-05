// Function to format timestamps nicely
function formatTimestamp(timestampString) {
    // If timestampString is for a date without time, append time for proper parsing
    if (timestampString && typeof timestampString === 'string' && !timestampString.includes(':')) {
        timestampString += ' 00:00:00'; // Append a default time
    }
    const date = new Date(timestampString);
    if (isNaN(date.getTime())) return '--'; // Handle invalid date strings
    
    // Use options for specific locale formatting if needed, e.g., 'en-US'
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true };
    return date.toLocaleString(undefined, options); // Formats to local date and time
}

// Function to update the overall last updated timestamp in the header
function updateOverallTimestamp(timestamp) {
    const overallTimestampElement = document.getElementById('last-updated-overall');
    if (overallTimestampElement) {
        if (timestamp) {
            overallTimestampElement.textContent = `Last Refreshed: ${formatTimestamp(timestamp)}`;
        } else {
            // If no timestamp provided, use current time
            overallTimestampElement.textContent = `Last Refreshed: ${new Date().toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}`;
        }
    }
}

// Function to apply color based on daily change and data-type (UPDATED)
function applyChangeColor(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element || value === null || value === undefined || value === '--') {
        // Ensure default placeholder and color if data is missing/invalid
        if (element) {
            element.textContent = '--';
            element.classList.remove('text-green-600', 'text-red-600');
            element.classList.add('text-gray-700'); // Default neutral color
        }
        return;
    }

    // Clean up previous colors
    element.classList.remove('text-green-600', 'text-red-600', 'text-gray-700', 'change-positive', 'change-negative');

    const dataType = element.getAttribute('data-type');
    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
        element.textContent = '--';
        element.classList.add('text-gray-700');
        return;
    }

    if (dataType === 'positive-red-negative-green') { // For MBS/Shadow Bonds (Price based: negative change is good, positive is bad)
        if (numValue < 0) {
            element.classList.add('text-green-600');
        } else if (numValue > 0) {
            element.classList.add('text-red-600');
        } else {
            element.classList.add('text-gray-700'); // No change
        }
        element.textContent = value; // No '+' sign for price changes
    } else if (dataType === 'positive-green-negative-red') { // For US10Y (Yield based: positive change is green, negative is red)
        if (numValue > 0) {
            element.classList.add('text-green-600');
            element.textContent = '+' + value; // Add '+' sign for positive changes
        } else if (numValue < 0) {
            element.classList.add('text-red-600');
            element.textContent = value;
        } else {
            element.classList.add('text-gray-700'); // No change
            element.textContent = value;
        }
    } else {
        // Fallback if data-type is missing or unknown
        element.classList.add('text-gray-700');
        element.textContent = value;
    }
}

// Function to fetch and display US10Y data
async function fetchUS10YData() {
    try {
        const response = await fetch('/.netlify/functions/getUS10YData');
        const data = await response.json();

        // Check if data is valid before attempting to populate
        if (data && data.US10Y_Current) {
            const currentElement = document.getElementById('us10y-current');
            const openElement = document.getElementById('us10y-open');
            const changeElement = document.getElementById('us10y-change');
            const closeElement = document.getElementById('us10y-today-close'); // Corrected ID from 'us10y-close'
            const highElement = document.getElementById('us10y-high');
            const lowElement = document.getElementById('us10y-low');
            const timestampElement = document.getElementById('us10y-timestamp');

            if (currentElement) currentElement.textContent = data.US10Y_Current;
            if (openElement) openElement.textContent = data.US10Y_Open || '--';
            if (closeElement) closeElement.textContent = data.US10Y_Close || '--';
            if (highElement) highElement.textContent = data.US10Y_High || '--';
            if (lowElement) lowElement.textContent = data.US10Y_Low || '--';
            if (timestampElement) timestampElement.textContent = formatTimestamp(data.last_updated);

            // Apply color to the change element
            if (changeElement) applyChangeColor('us10y-change', data.US10Y_Daily_Change);
        } else {
            console.warn('US10Y data not found or incomplete:', data);
            // Optionally update UI to show error/loading state
            ['us10y-current', 'us10y-open', 'us10y-change', 'us10y-today-close', 'us10y-high', 'us10y-low', 'us10y-timestamp'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = '--';
                    element.classList.remove('text-green-600', 'text-red-600');
                    element.classList.add('text-gray-700');
                }
            });
        }
    } catch (error) {
        console.error('Error fetching US10Y data:', error);
        // Set all related elements to '--' on error
        ['us10y-current', 'us10y-open', 'us10y-change', 'us10y-today-close', 'us10y-high', 'us10y-low', 'us10y-timestamp'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '--';
                element.classList.remove('text-green-600', 'text-red-600');
                element.classList.add('text-gray-700');
            }
        });
    }
}

// Function to fetch and display MBS products data
async function fetchMBSData() {
    try {
        const response = await fetch('/.netlify/functions/getMBSData');
        const data = await response.json();

        if (data) {
            const mbsProducts = [
                { id: 'umbs-5-5', prefix: 'UMBS_5_5' },
                { id: 'umbs-6-0', prefix: 'UMBS_6_0' },
                { id: 'gnma-5-5', prefix: 'GNMA_5_5' },
                { id: 'gnma-6-0', prefix: 'GNMA_6_0' },
            ];

            mbsProducts.forEach(product => {
                const current = data[`${product.prefix}_Current`] || '--';
                const open = data[`${product.prefix}_Open`] || '--';
                const change = data[`${product.prefix}_Daily_Change`] || '--';
                const todayClose = data[`${product.prefix}_Close`] || '--'; // Assuming 'Close' in data refers to 'Today Close'
                const priorClose = data[`${product.prefix}_Prior_Close`] || '--';
                const high = data[`${product.prefix}_High`] || '--';
                const low = data[`${product.prefix}_Low`] || '--';

                const currentElem = document.getElementById(`${product.id}-current`);
                const openElem = document.getElementById(`${product.id}-open`);
                const changeElem = document.getElementById(`${product.id}-change`);
                const todayCloseElem = document.getElementById(`${product.id}-today-close`);
                const priorCloseElem = document.getElementById(`${product.id}-prior-close`);
                const highElem = document.getElementById(`${product.id}-high`);
                const lowElem = document.getElementById(`${product.id}-low`);

                // Check if elements exist before setting textContent
                if (currentElem) currentElem.textContent = current;
                if (openElem) openElem.textContent = open;
                if (changeElem) {
                    changeElem.textContent = change; // Set text first
                    applyChangeColor(`${product.id}-change`, change); // Then apply color
                }
                if (todayCloseElem) todayCloseElem.textContent = todayClose;
                if (priorCloseElem) priorCloseElem.textContent = priorClose;
                if (highElem) highElem.textContent = high;
                if (lowElem) lowElem.textContent = low;
            });
            
            const mbsTimestampElement = document.getElementById('mbs-timestamp');
            if (mbsTimestampElement) mbsTimestampElement.textContent = formatTimestamp(data.last_updated);
        } else {
            console.warn('MBS data not found or incomplete:', data);
        }
    } catch (error) {
        console.error('Error fetching MBS data:', error);
        // On error, set all related elements to '--'
        const mbsProducts = [ // Re-define if not in scope, though it should be
            { id: 'umbs-5-5', prefix: 'UMBS_5_5' }, { id: 'umbs-6-0', prefix: 'UMBS_6_0' },
            { id: 'gnma-5-5', prefix: 'GNMA_5_5' }, { id: 'gnma-6-0', prefix: 'GNMA_6_0' }
        ];
        mbsProducts.forEach(product => {
            const ids = ['current', 'open', 'change', 'today-close', 'prior-close', 'high', 'low'];
            ids.forEach(suffix => {
                const element = document.getElementById(`${product.id}-${suffix}`);
                if (element) {
                    element.textContent = '--';
                    element.classList.remove('text-green-600', 'text-red-600');
                    element.classList.add('text-gray-700');
                }
            });
        });
        const mbsTimestampElement = document.getElementById('mbs-timestamp');
        if (mbsTimestampElement) mbsTimestampElement.textContent = '--';
    }
}

// Function to fetch and display Shadow Bonds data
async function fetchShadowBondsData() {
    try {
        const response = await fetch('/.netlify/functions/getShadowBondsData');
        const data = await response.json();

        if (data) {
            const shadowProducts = [
                { id: 'umbs-5-5-shadow', prefix: 'UMBS_5_5_Shadow' },
                { id: 'umbs-6-0-shadow', prefix: 'UMBS_6_0_Shadow' },
                { id: 'gnma-5-5-shadow', prefix: 'GNMA_5_5_Shadow' },
                { id: 'gnma-6-0-shadow', prefix: 'GNMA_6_0_Shadow' },
            ];

            shadowProducts.forEach(product => {
                const current = data[`${product.prefix}_Current`] || '--';
                const open = data[`${product.prefix}_Open`] || '--';
                const change = data[`${product.prefix}_Daily_Change`] || '--';
                const todayClose = data[`${product.prefix}_Close`] || '--'; // Assuming 'Close' in data refers to 'Today Close'
                const priorClose = data[`${product.prefix}_Prior_Close`] || '--';
                const high = data[`${product.prefix}_High`] || '--';
                const low = data[`${product.prefix}_Low`] || '--';

                const currentElem = document.getElementById(`${product.id}-current`);
                const openElem = document.getElementById(`${product.id}-open`);
                const changeElem = document.getElementById(`${product.id}-change`);
                const todayCloseElem = document.getElementById(`${product.id}-today-close`);
                const priorCloseElem = document.getElementById(`${product.id}-prior-close`);
                const highElem = document.getElementById(`${product.id}-high`);
                const lowElem = document.getElementById(`${product.id}-low`);

                if (currentElem) currentElem.textContent = current;
                if (openElem) openElem.textContent = open;
                if (changeElem) {
                    changeElem.textContent = change; // Set text first
                    applyChangeColor(`${product.id}-change`, change); // Then apply color
                }
                if (todayCloseElem) todayCloseElem.textContent = todayClose;
                if (priorCloseElem) priorCloseElem.textContent = priorClose;
                if (highElem) highElem.textContent = high;
                if (lowElem) lowElem.textContent = low;
            });
            const shadowTimestampElement = document.getElementById('shadow-timestamp');
            if (shadowTimestampElement) shadowTimestampElement.textContent = formatTimestamp(data.last_updated);
        } else {
            console.warn('Shadow Bonds data not found or incomplete:', data);
        }
    } catch (error) {
        console.error('Error fetching Shadow Bonds data:', error);
        // On error, set all related elements to '--'
        const shadowProducts = [ // Re-define if not in scope
            { id: 'umbs-5-5-shadow', prefix: 'UMBS_5_5_Shadow' }, { id: 'umbs-6-0-shadow', prefix: 'UMBS_6_0_Shadow' },
            { id: 'gnma-5-5-shadow', prefix: 'GNMA_5_5_Shadow' }, { id: 'gnma-6-0-shadow', prefix: 'GNMA_6_0_Shadow' }
        ];
        shadowProducts.forEach(product => {
            const ids = ['current', 'open', 'change', 'today-close', 'prior-close', 'high', 'low'];
            ids.forEach(suffix => {
                const element = document.getElementById(`${product.id}-${suffix}`);
                if (element) {
                    element.textContent = '--';
                    element.classList.remove('text-green-600', 'text-red-600');
                    element.classList.add('text-gray-700');
                }
            });
        });
        const shadowTimestampElement = document.getElementById('shadow-timestamp');
        if (shadowTimestampElement) shadowTimestampElement.textContent = '--';
    }
}

// NEW FUNCTION: Fetch and display Mortgage Rates data (dynamic table)
async function fetchMortgageRatesData() {
    try {
        const response = await fetch('/.netlify/functions/getMortgageRatesData'); // Assuming a Netlify function for mortgage rates
        const ratesData = await response.json();

        const tableBody = document.getElementById('mortgage-rates-table-body');
        if (!tableBody) {
            console.error('Mortgage rates table body element not found!');
            return;
        }

        // Clear existing loading message or rows
        tableBody.innerHTML = '';

        if (ratesData && ratesData.mortgage_products && ratesData.mortgage_products.length > 0) {
            ratesData.mortgage_products.forEach(product => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50'; // Tailwind class for hover effect
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${product.Name || '--'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${product.Rate ? `${product.Rate}%` : '--'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${product.APR ? `${product.APR}%` : '--'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${product.Points || '--'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${product['Monthly P&I'] || '--'}</td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">No mortgage rates data available.</td>
                </tr>
            `;
            console.warn('No mortgage rates data found or incomplete:', ratesData);
        }
        // The hardcoded timestamp in HTML already handles the mortgage rates update, so no JS update needed there.
        // If you had a dynamic timestamp for this section (e.g., <span id="mortgage-rates-timestamp">),
        // you would populate it here: document.getElementById('mortgage-rates-timestamp').textContent = formatTimestamp(ratesData.last_updated);

    } catch (error) {
        console.error('Error fetching mortgage rates data:', error);
        const tableBody = document.getElementById('mortgage-rates-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4 whitespace-nowrap text-center text-sm text-red-500">Error loading mortgage rates.</td>
                </tr>
            `;
        }
    }
}


// Initial data fetch on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Initial fetches - using Promise.all to fetch all data concurrently
    const [us10yResult, mbsResult, shadowResult, mortgageRatesResult] = await Promise.allSettled([
        fetchUS10YData(),
        fetchMBSData(),
        fetchShadowBondsData(),
        fetchMortgageRatesData() // Call the new mortgage rates function
    ]);

    // Update overall timestamp based on *current* time for initial load
    // If you want a timestamp from your backend, you'd need to modify `updateOverallTimestamp`
    // to accept a data timestamp as an argument and fetch it from one of the successful results.
    updateOverallTimestamp(); 

    // Refresh data every 30 seconds (adjust as needed)
    setInterval(async () => {
        // Re-fetch all data periodically
        await Promise.allSettled([
            fetchUS10YData(),
            fetchMBSData(),
            fetchShadowBondsData(),
            fetchMortgageRatesData()
        ]);
        updateOverallTimestamp();
    }, 30000);
});
