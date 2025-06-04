// Function to format timestamps nicely
function formatTimestamp(timestampString) {
    if (!timestampString) return '--';
    const date = new Date(timestampString);
    if (isNaN(date)) return '--'; // Handle invalid date strings
    return date.toLocaleString(); // Formats to local date and time
}

// Function to update the overall last updated timestamp in the header
function updateOverallTimestamp() {
    const now = new Date().toLocaleString();
    document.getElementById('last-updated-overall').textContent = `Last Refreshed: ${now}`;
}

// Function to apply color based on daily change
function applyChangeColor(elementId, value) {
    const element = document.getElementById(elementId);
    if (element && value !== '--') {
        const floatValue = parseFloat(value);
        element.classList.remove('change-positive', 'change-negative');
        if (floatValue > 0) {
            element.classList.add('change-positive');
        } else if (floatValue < 0) {
            element.classList.add('change-negative');
        }
    }
}

// Function to fetch and display US10Y data
async function fetchUS10YData() {
    try {
        // This will call your Netlify Function to get US10Y data
        const response = await fetch('/.netlify/functions/getUS10YData');
        const data = await response.json();

        if (data && data.US10Y_Current) {
            document.getElementById('us10y-current').textContent = data.US10Y_Current;
            document.getElementById('us10y-open').textContent = data.US10Y_Open;
            document.getElementById('us10y-change').textContent = data.US10Y_Daily_Change;
            document.getElementById('us10y-close').textContent = data.US10Y_Close;
            document.getElementById('us10y-timestamp').textContent = formatTimestamp(data.last_updated);
            applyChangeColor('us10y-change', data.US10Y_Daily_Change);
        } else {
            console.warn('US10Y data not found or incomplete:', data);
            // Optionally update UI to show error/loading state
        }
    } catch (error) {
        console.error('Error fetching US10Y data:', error);
        // Optionally update UI to show error state
    }
}

// Function to fetch and display MBS products data
async function fetchMBSData() {
    try {
        // This will call your Netlify Function to get MBS data
        const response = await fetch('/.netlify/functions/getMBSData'); // Assuming a new function for MBS
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
                const close = data[`${product.prefix}_Close`] || '--';

                document.getElementById(`${product.id}-current`).textContent = current;
                document.getElementById(`${product.id}-open`).textContent = open;
                document.getElementById(`${product.id}-change`).textContent = change;
                document.getElementById(`${product.id}-close`).textContent = close;
                applyChangeColor(`${product.id}-change`, change);
            });
            document.getElementById('mbs-timestamp').textContent = formatTimestamp(data.last_updated);
        } else {
            console.warn('MBS data not found or incomplete:', data);
        }
    } catch (error) {
        console.error('Error fetching MBS data:', error);
    }
}

// Function to fetch and display Shadow Bonds data
async function fetchShadowBondsData() {
    try {
        // This will call your Netlify Function to get Shadow Bonds data
        const response = await fetch('/.netlify/functions/getShadowBondsData'); // Assuming a new function for Shadow Bonds
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
                const close = data[`${product.prefix}_Close`] || '--';

                document.getElementById(`${product.id}-current`).textContent = current;
                document.getElementById(`${product.id}-open`).textContent = open;
                document.getElementById(`${product.id}-change`).textContent = change;
                document.getElementById(`${product.id}-close`).textContent = close;
                applyChangeColor(`${product.id}-change`, change);
            });
            document.getElementById('shadow-timestamp').textContent = formatTimestamp(data.last_updated);
        } else {
            console.warn('Shadow Bonds data not found or incomplete:', data);
        }
    } catch (error) {
        console.error('Error fetching Shadow Bonds data:', error);
    }
}

// Initial data fetch on page load
document.addEventListener('DOMContentLoaded', () => {
    updateOverallTimestamp();
    fetchUS10YData();
    fetchMBSData();
    fetchShadowBondsData();

    // Refresh data every 30 seconds (adjust as needed)
    setInterval(() => {
        updateOverallTimestamp();
        fetchUS10YData();
        fetchMBSData();
        fetchShadowBondsData();
    }, 30000); 
});
