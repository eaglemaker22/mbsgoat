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

// Function to update the status message on the page
function updateStatus(message, type = 'loading') {
    const statusDisplay = document.getElementById('status-display');
    if (statusDisplay) {
        statusDisplay.textContent = message;
        statusDisplay.classList.remove('status-loading', 'status-success', 'status-error');
        statusDisplay.classList.add(`status-${type}`);
    }
}

// Fetch US10Y Data from Netlify Function
async function fetchUS10YData() {
    updateStatus('Fetching data from Netlify Function...');
    console.log("Attempting to fetch US10Y data from Netlify Function...");
    try {
        const response = await fetch('/.netlify/functions/getUS10YDataTest'); // Note the test function name
        
        if (!response.ok) {
            const errorText = await response.text(); // Get raw text to see serverless function errors
            console.error('Netlify Function HTTP Error:', response.status, response.statusText, 'Response Body:', errorText);
            throw new Error(`Function failed with status ${response.status}: ${errorText.substring(0, 200)}...`);
        }

        const data = await response.json();

        // Check if data is valid and contains expected fields
        if (data && typeof data.US10Y_Current !== 'undefined' && data.last_updated) {
            document.getElementById('us10y-current-value').textContent = parseFloat(data.US10Y_Current).toFixed(3) + '%';
            document.getElementById('us10y-timestamp').textContent = formatTimestamp(data.last_updated);
            updateStatus('Successfully loaded US10Y data!', 'success');
            console.log("US10Y Data received and displayed:", data);
        } else {
            const errorMessage = "Data received but missing expected 'US10Y_Current' or 'last_updated' fields.";
            document.getElementById('us10y-current-value').textContent = 'N/A';
            document.getElementById('us10y-timestamp').textContent = 'N/A';
            updateStatus(`Error: ${errorMessage}`, 'error');
            console.error(errorMessage, data);
        }

    } catch (error) {
        console.error('Error in fetchUS10YData:', error);
        document.getElementById('us10y-current-value').textContent = 'Error';
        document.getElementById('us10y-timestamp').textContent = 'Error';
        updateStatus(`Failed to load data. Details: ${error.message}`, 'error');
    }
}

// Initial fetch on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchUS10YData();
    // Set up a refresh interval for testing (e.g., every 15 seconds)
    setInterval(fetchUS10YData, 15 * 1000); 
});
