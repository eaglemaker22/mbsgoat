// script.js

console.log("JavaScript Loaded and Running!"); // Indicator in console

// Add a visible indicator on the page
const jsIndicator = document.createElement('div');
jsIndicator.textContent = 'JavaScript Running!';
jsIndicator.className = 'debug-indicator-js';
document.body.appendChild(jsIndicator);

async function fetchData() {
  try {
    const response = await fetch('/.netlify/functions/getData'); // Your Netlify Function URL
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
document.getElementById('subscribe-button').addEventListener('click', async () => {
  try {
    const response = await fetch('https://us-central1-mbsgoat-d3eb2.cloudfunctions.net/createCheckoutSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com' // 🔁 Replace with real user's email if available
      })
    });

    const result = await response.json();

    if (response.ok && result.url) {
      window.location.href = result.url; // Redirect to Stripe Checkout
    } else {
      alert('Failed to start subscription: ' + JSON.stringify(result));

    }
  } catch (err) {
    console.error('Error during checkout:', err);
    alert('Network or server error. Try again later.');
  }
});

// Fetch data initially when the page loads
fetchData();

// Refresh data every 2 minutes (120000 milliseconds)
setInterval(fetchData, 120000);
