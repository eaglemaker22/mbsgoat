// script.js

console.log("JavaScript Loaded and Running!"); // Still useful for initial debugging

async function fetchData() {
  try {
    const response = await fetch('/.netlify/functions/getData'); // Your Netlify Function URL
    const data = await response.json();

    if (response.ok) {
      const us10yElement = document.getElementById('us10y-value');
      const us30yElement = document.getElementById('us30y-value'); // Get the new element
      const timestampElement = document.getElementById('us10y-timestamp');

      if (us10yElement) {
        us10yElement.textContent = data.US10Y;
      } else {
        console.error('Element with ID "us10y-value" not found in HTML.');
      }

      if (us30yElement) {
        us30yElement.textContent = data.US30Y; // Display US30Y
      } else {
        console.error('Element with ID "us30y-value" not found in HTML.');
      }

      if (timestampElement) {
        timestampElement.textContent = `Last updated: ${data.timestamp}`;
      } else {
        console.error('Element with ID "us10y-timestamp" not found in HTML.');
      }
    } else {
      console.error('Error fetching data:', data.error);
      const us10yElement = document.getElementById('us10y-value');
      const us30yElement = document.getElementById('us30y-value');
      const timestampElement = document.getElementById('us10y-timestamp');
      if (us10yElement) us10yElement.textContent = 'Error loading data';
      if (us30yElement) us30yElement.textContent = 'Error loading data';
      if (timestampElement) timestampElement.textContent = '';
    }
  } catch (error) {
    console.error('Network error:', error);
    const us10yElement = document.getElementById('us10y-value');
    const us30yElement = document.getElementById('us30y-value');
    const timestampElement = document.getElementById('us10y-timestamp');
    if (us10yElement) us10yElement.textContent = 'Network error';
    if (us30yElement) us30yElement.textContent = 'Network error';
    if (timestampElement) timestampElement.textContent = '';
  }
}

// Fetch data initially when the page loads
fetchData();

// Refresh data every 2 minutes (120000 milliseconds)
setInterval(fetchData, 120000);
