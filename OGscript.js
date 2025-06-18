// script.js

console.log("JavaScript Loaded and Running!"); // Indicator in console

// Add a visible indicator on the page
const jsIndicator = document.createElement('div');
jsIndicator.textContent = 'JavaScript Running!';
jsIndicator.className = 'debug-indicator-js';
document.body.appendChild(jsIndicator);

// Fetch Bond Data
async function fetchData() {
  try {
    const response = await fetch('/.netlify/functions/getData');
    const data = await response.json();

    if (response.ok) {
      const us10yElement = document.getElementById('us10y-value');
      const timestampElement = document.getElementById('us10y-timestamp');

      if (us10yElement) {
        us10yElement.textContent = data.US10Y;
      } else {
        console.error('Element with ID "us10y-value" not found in HTML.');
      }

      if (timestampElement) {
        timestampElement.textContent = `Last updated: ${data.timestamp}`;
      } else {
        console.error('Element with ID "us10y-timestamp" not found in HTML.');
      }
    } else {
      console.error('Error fetching data:', data.error);
      const us10yElement = document.getElementById('us10y-value');
      const timestampElement = document.getElementById('us10y-timestamp');
      if (us10yElement) us10yElement.textContent = 'Error loading data';
      if (timestampElement) timestampElement.textContent = '';
    }
  } catch (error) {
    console.error('Network error:', error);
    const us10yElement = document.getElementById('us10y-value');
    const timestampElement = document.getElementById('us10y-timestamp');
    if (us10yElement) us10yElement.textContent = 'Network error';
    if (timestampElement) timestampElement.textContent = '';
  }
}

// Stripe Checkout Handler
async function subscribeToMBSGOAT() {
  try {
    const response = await fetch('/.netlify/functions/createCheckoutSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'testuser@example.com' // Replace with dynamic or real email later
      })
    });

    const result = await response.json();

    if (response.ok && result.url) {
      window.location.href = result.url;
    } else {
      alert('Failed to start subscription: ' + JSON.stringify(result));
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// Fetch data on load
fetchData();
setInterval(fetchData, 120000); // Refresh every 2 minutes

// Bind button if present
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('subscribe-btn');
  if (btn) {
    btn.addEventListener('click', subscribeToMBSGOAT);
  }
});
