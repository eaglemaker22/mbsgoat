// Ensure this script runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {

    // Function to apply color based on value and data-type attribute
    // This function should be called whenever you update a 'change' value
    function applyChangeColor(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element with ID ${elementId} not found.`);
            return;
        }

        // Remove any previous color classes to ensure clean state
        element.classList.remove('text-green-600', 'text-red-600', 'text-gray-700');

        const dataType = element.getAttribute('data-type');
        const numValue = parseFloat(value); // Convert value to a number for comparison

        // Check if the value is a valid number, otherwise set default
        if (isNaN(numValue)) {
            element.textContent = '--'; // Display placeholder
            element.classList.add('text-gray-700'); // Default color
            return;
        }

        // Apply coloring logic based on data-type
        if (dataType === 'positive-red-negative-green') { // For MBS/Shadow Bonds (Price)
            if (numValue < 0) {
                element.classList.add('text-green-600'); // Negative change (price up) is good
            } else if (numValue > 0) {
                element.classList.add('text-red-600');    // Positive change (price down) is bad
            } else {
                element.classList.add('text-gray-700');   // No change
            }
        } else if (dataType === 'positive-green-negative-red') { // For US10Y (Yield)
            if (numValue > 0) {
                element.classList.add('text-green-600'); // Positive change (yield up) is good for bond holders looking to buy, bad for borrowers
            } else if (numValue < 0) {
                element.classList.add('text-red-600');    // Negative change (yield down) is bad for bond holders looking to buy, good for borrowers
            } else {
                element.classList.add('text-gray-700');   // No change
            }
        } else {
            element.classList.add('text-gray-700'); // Fallback default color
        }

        // Update the displayed text, adding a '+' sign for positive changes if desired
        element.textContent = (numValue > 0 && dataType !== 'positive-red-negative-green' ? '+' : '') + value;
        // Note: For MBS/Shadow Bonds, a positive change is red, so you might not want a '+' sign for it
        // Adjust the above line as needed based on your exact display preference for positive/negative signs.
    }

    // --- IMPORTANT: How to integrate this into your existing data fetching ---
    // You will have code that fetches data (e.g., using `fetch()` or `XMLHttpRequest`)
    // from your Python backend. Let's assume your data comes back in a structure
    // like this (you'll need to adapt this to your actual data structure):
    /*
    const liveData = {
        mbs: {
            'umbs-5-5-current': '99.50',
            'umbs-5-5-change': '-0.125',
            'umbs-6-0-current': '100.25',
            'umbs-6-0-change': '0.0625',
            // ... other MBS data
        },
        shadow: {
            'umbs-5-5-shadow-current': '99.60',
            'umbs-5-5-shadow-change': '-0.05',
            // ... other shadow data
        },
        us10y: {
            'us10y-current': '4.25',
            'us10y-change': '0.02',
        }
    };
    */

    // Example of how you would populate data and then apply colors:
    function populateAndColorDashboard(data) {
        // MBS Products
        document.getElementById('umbs-5-5-current').textContent = data.mbs['umbs-5-5-current'];
        applyChangeColor('umbs-5-5-change', data.mbs['umbs-5-5-change']);

        document.getElementById('umbs-6-0-current').textContent = data.mbs['umbs-6-0-current'];
        applyChangeColor('umbs-6-0-change', data.mbs['umbs-6-0-change']);

        document.getElementById('gnma-5-5-current').textContent = data.mbs['gnma-5-5-current'];
        applyChangeColor('gnma-5-5-change', data.mbs['gnma-5-5-change']);

        document.getElementById('gnma-6-0-current').textContent = data.mbs['gnma-6-0-current'];
        applyChangeColor('gnma-6-0-change', data.mbs['gnma-6-0-change']);

        // Shadow Bonds
        document.getElementById('umbs-5-5-shadow-current').textContent = data.shadow['umbs-5-5-shadow-current'];
        applyChangeColor('umbs-5-5-shadow-change', data.shadow['umbs-5-5-shadow-change']);

        document.getElementById('umbs-6-0-shadow-current').textContent = data.shadow['umbs-6-0-shadow-current'];
        applyChangeColor('umbs-6-0-shadow-change', data.shadow['umbs-6-0-shadow-change']);

        document.getElementById('gnma-5-5-shadow-current').textContent = data.shadow['gnma-5-5-shadow-current'];
        applyChangeColor('gnma-5-5-shadow-change', data.shadow['gnma-5-5-shadow-change']);

        document.getElementById('gnma-6-0-shadow-current').textContent = data.shadow['gnma-6-0-shadow-current'];
        applyChangeColor('gnma-6-0-shadow-change', data.shadow['gnma-6-0-shadow-change']);

        // US 10-Year Treasury Yield
        document.getElementById('us10y-current').textContent = data.us10y['us10y-current'] + '%';
        applyChangeColor('us10y-change', data.us10y['us10y-change']);

        // ... continue for other fields like open, high, low, close if your data includes them
        // document.getElementById('umbs-5-5-open').textContent = data.mbs['umbs-5-5-open'];
        // etc.

        // Update timestamps (if your data includes them)
        // document.getElementById('mbs-timestamp').textContent = data.mbs.timestamp;
        // document.getElementById('shadow-timestamp').textContent = data.shadow.timestamp;
        // document.getElementById('us10y-timestamp').textContent = data.us10y.timestamp;
        // document.getElementById('last-updated-overall').textContent = data.overallTimestamp;
    }

    // --- Example of fetching real data (replace with your actual Python API call) ---
    // fetch('/your-api-endpoint') // Replace with the actual URL your Python Flask/Django serves data from
    //     .then(response => response.json())
    //     .then(data => {
    //         populateAndColorDashboard(data);
    //     })
    //     .catch(error => {
    //         console.error('Error fetching dashboard data:', error);
    //         // Optionally display an error message on the dashboard
    //     });


    // --- For testing, you can use mock data like this. Remove or comment out in production. ---
    const mockData = {
        mbs: {
            'umbs-5-5-current': '99.50',
            'umbs-5-5-change': '-0.125', // Should be green for MBS
            'umbs-5-5-open': '99.60',
            'umbs-5-5-today-close': '99.50',
            'umbs-5-5-prior-close': '99.625',
            'umbs-5-5-high': '99.70',
            'umbs-5-5-low': '99.40',

            'umbs-6-0-current': '100.25',
            'umbs-6-0-change': '0.0625', // Should be red for MBS
            'umbs-6-0-open': '100.1875',
            'umbs-6-0-today-close': '100.25',
            'umbs-6-0-prior-close': '100.1875',
            'umbs-6-0-high': '100.30',
            'umbs-6-0-low': '100.10',

            'gnma-5-5-current': '98.75',
            'gnma-5-5-change': '-0.03125', // Should be green for MBS
            'gnma-5-5-open': '98.80',
            'gnma-5-5-today-close': '98.75',
            'gnma-5-5-prior-close': '98.78125',
            'gnma-5-5-high': '98.90',
            'gnma-5-5-low': '98.60',

            'gnma-6-0-current': '99.875',
            'gnma-6-0-change': '0.09375', // Should be red for MBS
            'gnma-6-0-open': '99.78125',
            'gnma-6-0-today-close': '99.875',
            'gnma-6-0-prior-close': '99.78125',
            'gnma-6-0-high': '99.95',
            'gnma-6-0-low': '99.70',
        },
        shadow: {
            'umbs-5-5-shadow-current': '99.60',
            'umbs-5-5-shadow-change': '-0.05', // Should be green for Shadows
            'umbs-5-5-shadow-open': '99.65',
            'umbs-5-5-shadow-today-close': '99.60',
            'umbs-5-5-shadow-prior-close': '99.65',
            'umbs-5-5-shadow-high': '99.75',
            'umbs-5-5-shadow-low': '99.50',

            'umbs-6-0-shadow-current': '100.30',
            'umbs-6-0-shadow-change': '0.02', // Should be red for Shadows
            'umbs-6-0-shadow-open': '100.28',
            'umbs-6-0-shadow-today-close': '100.30',
            'umbs-6-0-shadow-prior-close': '100.28',
            'umbs-6-0-shadow-high': '100.35',
            'umbs-6-0-shadow-low': '100.20',

            'gnma-5-5-shadow-current': '98.80',
            'gnma-5-5-shadow-change': '-0.01', // Should be green for Shadows
            'gnma-5-5-shadow-open': '98.81',
            'gnma-5-5-shadow-today-close': '98.80',
            'gnma-5-5-shadow-prior-close': '98.81',
            'gnma-5-5-shadow-high': '98.85',
            'gnma-5-5-shadow-low': '98.70',

            'gnma-6-0-shadow-current': '99.90',
            'gnma-6-0-shadow-change': '0.03', // Should be red for Shadows
            'gnma-6-0-shadow-open': '99.87',
            'gnma-6-0-shadow-today-close': '99.90',
            'gnma-6-0-shadow-prior-close': '99.87',
            'gnma-6-0-shadow-high': '99.95',
            'gnma-6-0-shadow-low': '99.80',
        },
        us10y: {
            'us10y-current': '4.25',
            'us10y-change': '0.02', // Should be green for US10Y
            'us10y-open': '4.23',
            'us10y-today-close': '4.25',
            'us10y-prior-close': '4.23',
            'us10y-high': '4.27',
            'us10y-low': '4.20',
        }
    };

    populateAndColorDashboard(mockData);

    // You would typically set up a setInterval here to refresh the data periodically
    // For example, every 30 seconds:
    // setInterval(() => {
    //     fetch('/your-api-endpoint')
    //         .then(response => response.json())
    //         .then(data => populateAndColorDashboard(data))
    //         .catch(error => console.error('Error refreshing data:', error));
    // }, 30000);
});
