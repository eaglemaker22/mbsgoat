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

// Fetch MBS Timestamp
async function fetchMBSTimestamp() {
    try {
        const response = await fetch('/.netlify/functions/getMBSData');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const timestampElem = document.getElementById('mbs-timestamp');
        if (timestampElem) {
            timestampElem.textContent = formatTimestamp(data.last_updated);
            console.log("MBS Timestamp received:", data.last_updated);
        }
    } catch (error) {
        console.error('Error fetching MBS timestamp:', error);
        document.getElementById('mbs-timestamp').textContent = `Error: ${error.message}`;
    }
}

// Fetch Shadow Bonds Timestamp
async function fetchShadowBondsTimestamp() {
    try {
        const response = await fetch('/.netlify/functions/getShadowBondsData');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const timestampElem = document.getElementById('shadow-timestamp');
        if (timestampElem) {
            timestampElem.textContent = formatTimestamp(data.last_updated);
            console.log("Shadow Bonds Timestamp received:", data.last_updated);
        }
    } catch (error) {
        console.error('Error fetching Shadow Bonds timestamp:', error);
        document.getElementById('shadow-timestamp').textContent = `Error: ${error.message}`;
    }
}

// Fetch US 10-Year Treasury Yield Timestamp
async function fetchUS10YTimestamp() {
    try {
        const response = await fetch('/.netlify/functions/getUS10YData');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const timestampElem = document.getElementById('us10y-timestamp');
        if (timestampElem) {
            timestampElem.textContent = formatTimestamp(data.last_updated);
            console.log("US 10Y Timestamp received:", data.last_updated);
        }
    } catch (error) {
        console.error('Error fetching US 10Y timestamp:', error);
        document.getElementById('us10y-timestamp').textContent = `Error: ${error.message}`;
    }
}

// Fetch Mortgage Rates Timestamp
async function fetchMortgageRatesTimestamp() {
    try {
        const response = await fetch('/.netlify/functions/getMortgageRatesData');
        if (!response.ok) {
            const errorText = await response.text(); // Get the raw response text
            console.error('HTTP error from getMortgageRatesData:', response.status, response.statusText, 'Response text:', errorText);
            throw new Error(`HTTP error! Status: ${response.status}. Response was: ${errorText.substring(0, 100)}...`); // Show part of the response
        }
        const data = await response.json(); // Attempt to parse as JSON
        const timestampElem = document.getElementById('mortgage-rates-timestamp');
        if (timestampElem) {
            timestampElem.textContent = formatTimestamp(data.last_updated);
            console.log("Mortgage Rates Timestamp received:", data.last_updated);
        }
    } catch (error) {
        console.error('Error fetching Mortgage Rates timestamp:', error);
        // Display a more specific error message on the page
        document.getElementById('mortgage-rates-timestamp').textContent = `Error: Function returned invalid data. Check Netlify logs. Details: ${error.message}`;
    }
}

// Update the overall last updated timestamp (local browser time)
function updateOverallTimestamp() {
    const overallTimestampElement = document.getElementById('last-updated-overall');
    if (overallTimestampElement) {
        overallTimestampElement.textContent = formatTimestamp(new Date().toISOString());
    }
}

// Initial fetches and set up intervals
document.addEventListener('DOMContentLoaded', () => {
    updateOverallTimestamp(); // Update immediately on load
    fetchMBSTimestamp();
    fetchShadowBondsTimestamp();
    fetchUS10YTimestamp();
    fetchMortgageRatesTimestamp();

    // Set up refresh intervals for 15 seconds for easier observation
    setInterval(updateOverallTimestamp, 15 * 1000);
    setInterval(fetchMBSTimestamp, 15 * 1000);
    setInterval(fetchShadowBondsTimestamp, 15 * 1000);
    setInterval(fetchUS10YTimestamp, 15 * 1000);
    setInterval(fetchMortgageRatesTimestamp, 15 * 1000);
});
