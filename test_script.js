document.getElementById('subscribe-button').addEventListener('click', async () => {
  try {
    const response = await fetch('/.netlify/functions/createCheckoutSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: 'test@example.com' })
    });

    const data = await response.json();

    if (response.ok && data.url) {
      window.location.href = data.url;
    } else {
      console.error('Failed to start subscription:', data);
      alert('Subscription failed. See console.');
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Network error');
  }
});
