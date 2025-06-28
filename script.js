// --- Firebase Configuration (Placeholder) ---
// IMPORTANT: Replace with your actual Firebase project configuration
// You can find this in your Firebase project settings -> Project settings -> General -> Your apps -> Firebase SDK snippet -> Config
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    databaseURL: "YOUR_DATABASE_URL", // For Realtime Database
};

// Initialize Firebase (if you are using the CDN links in index.html)
// if (typeof firebase !== 'undefined') {
//     firebase.initializeApp(firebaseConfig);
//     const database = firebase.database();
//     console.log("Firebase initialized!");
// } else {
//     console.warn("Firebase SDK not loaded. Ensure CDN links or module imports are correct.");
// }

// If you are using Firebase with modular imports (e.g., with a bundler like Webpack/Vite):
/*
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
*/

// --- Helper Functions to Update DOM Elements ---

/**
 * Updates a single text element by its ID.
 * @param {string} elementId - The ID of the HTML element.
 * @param {string} value - The new text content for the element.
 */
function updateTextElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    } else {
        console.warn(`Element with ID '${elementId}' not found.`);
    }
}

/**
 * Updates a change indicator (value and color).
 * @param {string} valueElementId - ID for the value span.
 * @param {string} changeElementId - ID for the change span.
 * @param {number|string} value - The main value (e.g., 99.55).
 * @param {number|string} change - The change value (e.g., -0.05).
 */
function updateChangeIndicator(valueElementId, changeElementId, value, change) {
    updateTextElement(valueElementId, value);
    const changeElement = document.getElementById(changeElementId);
    if (changeElement) {
        changeElement.textContent = (typeof change === 'number' && change > 0 ? '+' : '') + change;
        changeElement.classList.remove('positive', 'negative');
        if (typeof change === 'number') {
            if (change > 0) {
                changeElement.classList.add('positive');
            } else if (change < 0) {
                changeElement.classList.add('negative');
            }
        } else if (typeof change === 'string') {
            // Handle string changes like "+0.03%"
            if (change.startsWith('+')) {
                changeElement.classList.add('positive');
            } else if (change.startsWith('-')) {
                changeElement.classList.add('negative');
            }
        }
    }
}

/**
 * Populates the bond ticker table.
 * @param {Array<Object>} data - An array of objects, each representing a row.
 * Example: [{instrument: "UMS 5.5", change: -0.05, actual: 99.54, ...}]
 */
function populateBondTickerTable(data) {
    const tableBody = document.getElementById('bondTickerTableBody');
    if (!tableBody) {
        console.error("Bond ticker table body not found!");
        return;
    }
    tableBody.innerHTML = ''; // Clear existing rows

    data.forEach(rowData => {
        const row = tableBody.insertRow();
        const cells = [
            rowData.instrument,
            rowData.change,
            rowData.actual,
            rowData.open,
            rowData.prior,
            rowData.high,
            rowData.low,
            rowData.updated
        ];

        cells.forEach(cellData => {
            const cell = row.insertCell();
            cell.textContent = cellData;
            // Apply specific class for 'change' column if negative/positive
            if (cellData === rowData.change) { // Check if it's the change value
                if (typeof cellData === 'number') {
                    if (cellData < 0) {
                        cell.classList.add('negative');
                    } else if (cellData > 0) {
                        cell.classList.add('positive');
                    }
                } else if (typeof cellData === 'string') {
                    if (cellData.startsWith('-')) {
                        cell.classList.add('negative');
                    } else if (cellData.startsWith('+')) {
                        cell.classList.add('positive');
                    }
                }
            }
        });
    });
}

// --- Data Fetching and Updating Logic (Simulated Data First) ---

// Simulate fetching data from Firebase (replace with actual Firebase calls)
async function fetchAndDisplayData() {
    console.log("Attempting to fetch and display data...");

    // --- Header Data ---
    // In a real scenario, you'd get these from your database
    const headerData = {
        ums55: { value: 99.55, change: -0.05 },
        us10y: { value: 4.425, change: 0.01 },
        fixed30y: { value: "6.85%", change: "+0.03%" },
    };
    updateChangeIndicator('ums55Value', 'ums55Change', headerData.ums55.value, headerData.ums55.change);
    updateChangeIndicator('us10yValue', 'us10yChange', headerData.us10y.value, headerData.us10y.change);
    updateChangeIndicator('fixed30yValue', 'fixed30yChange', headerData.fixed30y.value, headerData.fixed30y.change);


    // --- Bond Ticker Data ---
    // This structure assumes an array of objects from your Firebase
    const bondTickerData = [
        { instrument: "UMS 5.5", change: -0.05, actual: 99.54, open: 100.54, prior: 101.54, high: 102.54, low: 103.54, updated: "10:00AM" },
        { instrument: "UMS 6.0", change: -0.05, actual: 100.24, open: 101.24, prior: 102.24, high: 103.24, low: 104.24, updated: "10:00AM" },
        { instrument: "GMA 5.5", change: -0.05, actual: 99.25, open: 100.25, prior: 101.25, high: 102.25, low: 103.25, updated: "10:00AM" },
        { instrument: "GMA 6.0", change: -0.05, actual: 101.25, open: 102.25, prior: 103.25, high: 104.25, low: 105.25, updated: "10:00AM" },
        { instrument: "Shadow 5.5", change: -0.05, actual: 99.54, open: 100.54, prior: 101.54, high: 102.54, low: 103.54, updated: "10:00AM" },
        { instrument: "Shadow 6.0", change: -0.05, actual: 100.24, open: 101.24, prior: 102.24, high: 103.24, low: 104.24, updated: "10:00AM" },
        { instrument: "Shadow GMNA 5.5", change: -0.05, actual: 99.25, open: 100.25, prior: 101.25, high: 102.25, low: 103.25, updated: "10:00AM" },
        { instrument: "Shadow GMNA 6.0", change: -0.05, actual: 101.25, open: 102.25, prior: 103.25, high: 104.25, low: 105.25, updated: "10:00AM" },
    ];
    populateBondTickerTable(bondTickerData);

    // --- Daily Rates Data ---
    // This assumes a structure like this in your Firebase
    const dailyRatesData = {
        fixed30y: { today: "7.88%", yesterday: "8.88%", lastWeek: "9.88%" },
        va30y: { today: "7.88%", yesterday: "8.88%", lastWeek: "9.88%" },
        fha30y: { today: "8.88%", yesterday: "9.88%", lastWeek: "10.88%" },
        jumbo30y: { today: "9.88%", yesterday: "10.88%", lastYear: "12.88%" },
        usda30y: { today: "10.88%", yesterday: "11.88%", lastYear: "12.88%" },
        investment30y: { today: "9.88%", yesterday: "12.88%", lastYear: "14.88%" },
    };

    updateTextElement('fixed30yToday', dailyRatesData.fixed30y.today);
    updateTextElement('fixed30yYesterday', dailyRatesData.fixed30y.yesterday);
    updateTextElement('fixed30yLastWeek', dailyRatesData.fixed30y.lastWeek);

    updateTextElement('va30yToday', dailyRatesData.va30y.today);
    updateTextElement('va30yYesterday', dailyRatesData.va30y.yesterday);
    updateTextElement('va30yLastWeek', dailyRatesData.va30y.lastWeek);

    updateTextElement('fha30yToday', dailyRatesData.fha30y.today);
    updateTextElement('fha30yYesterday', dailyRatesData.fha30y.yesterday);
    updateTextElement('fha30yLastWeek', dailyRatesData.fha30y.lastWeek);

    updateTextElement('jumbo30yToday', dailyRatesData.jumbo30y.today);
    updateTextElement('jumbo30yYesterday', dailyRatesData.jumbo30y.yesterday);
    updateTextElement('jumbo30yLastYear', dailyRatesData.jumbo30y.lastYear); // Note: lastYear for Jumbo

    updateTextElement('usda30yToday', dailyRatesData.usda30y.today);
    updateTextElement('usda30yYesterday', dailyRatesData.usda30y.yesterday);
    updateTextElement('usda30yLastYear', dailyRatesData.usda30y.lastYear); // Note: lastYear for USDA

    updateTextElement('investment30yToday', dailyRatesData.investment30y.today);
    updateTextElement('investment30yYesterday', dailyRatesData.investment30y.yesterday);
    updateTextElement('investment30yLastYear', dailyRatesData.investment30y.lastYear); // Note: lastYear for Investment

    // --- Firebase Integration Example (Realtime Database) ---
    // If you uncommented the Firebase initialization above:
    /*
    const headerRef = ref(database, 'header_data'); // Adjust path to your data
    onValue(headerRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            updateChangeIndicator('ums55Value', 'ums55Change', data.ums55.value, data.ums55.change);
            // ... update other header elements ...
        }
    });

    const bondTickerRef = ref(database, 'bond_ticker'); // Adjust path to your data
    onValue(bondTickerRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Firebase Realtime DB often returns objects, convert to array if needed
            const bondTickerArray = Object.values(data);
            populateBondTickerTable(bondTickerArray);
        }
    });

    const dailyRatesRef = ref(database, 'daily_rates'); // Adjust path to your data
    onValue(dailyRatesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            updateTextElement('fixed30yToday', data.fixed30y.today);
            // ... update other daily rates ...
        }
    });
    */
}


// --- Initial Data Load ---
// Call the function to fetch and display data when the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', fetchAndDisplayData);
