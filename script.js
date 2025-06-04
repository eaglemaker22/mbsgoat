// script.js

console.log("JavaScript Loaded and Running!");

async function fetchData() {
    try {
        const response = await fetch('/.netlify/functions/getData');
        const data = await response.json();

        if (response.ok) {
            // Update timestamp
            const timestampElement = document.getElementById('timestamp');
            if (timestampElement) {
                timestampElement.textContent = `Last updated: ${data.timestamp}`;
            } else {
                console.error('Element with ID "timestamp" not found in HTML.');
            }

            // Function to safely update text content
            function updateTextContent(id, value) {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value !== null && value !== undefined ? value : 'N/A';
                } else {
                    console.error(`Element with ID "${id}" not found in HTML.`);
                }
            }

            // Update US10Y Bond Yields (if still desired, assuming your Netlify Function might still send it or you'll get it from Firestore)
            updateTextContent('us10y-value', data.US10Y_Current); // Assuming you might add this to your Firestore data
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
            console.error('Error fetching data:', data.error);
            // You might want to update all display elements to show 'Error'
            document.querySelectorAll('.main-value, .detail-value').forEach(el => {
                el.textContent = 'Error loading data';
            });
            document.getElementById('timestamp').textContent = '';
        }
    } catch (error) {
        console.error('Network error:', error);
        document.querySelectorAll('.main-value, .detail-value').forEach(el => {
            el.textContent = 'Network error';
        });
        document.getElementById('timestamp').textContent = '';
    }
}

// Fetch data initially when the page loads
fetchData();

// Refresh data every 2 minutes (120000 milliseconds)
setInterval(fetchData, 120000);
