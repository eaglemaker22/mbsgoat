// /netlify/functions/getData.js
exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      US10Y: "4.28%", // Replace with dynamic data if available
      timestamp: new Date().toLocaleString()
    })
  };
};
