console.log("JavaScript Loaded and Running!");

// Debug indicator in the DOM
const jsIndicator = document.createElement('div');
jsIndicator.textContent = 'JavaScript Running!';
jsIndicator.className = 'debug-indicator-js text-sm text-green-600 mt-4';
document.body.appendChild(jsIndicator);

// Fetch 10-Year Treasury Yield
async function fetchData() {
  try {
    const response = await fetch('/.netlify/functions/getData');
    const data = await response.json();

    if (response.ok) {
      document.getElementById('us10y-value').textContent = data.US10Y;
      document.getElementById('us10y-timestamp').textContent = `Last updated: ${data.timestamp}`;
    } else {
      document.getElementById('us10y-value').textContent = 'Error loading data';
      document.getElementById('us10y-timestamp').textContent = '';
    }
  } catch (error) {
    document.getElementById('us10y-value').textContent = 'Network error';
    document.getElementById('us10y-timestamp').textContent = '';
    console.error('Network error:', error);
  }
}

fetchData();
setInterval(fetchData, 120000);

// Stripe subscription
document.getElementById('subscribe-button').addEventListener('click', async () => {
  const email = prompt("Enter your email to subscribe:");

  if (!email) return;

  try {
    const response = await fetch('/.netlify/functions/createCheckoutSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const result = await response.json();

    if (response.ok && result.url) {
      window.location.href = result.url;
    } else {
      alert(`Failed to start subscription: ${JSON.stringify(result)}`);
    }
  } catch (err) {
    alert('Network error: ' + err.message);
  }
});
