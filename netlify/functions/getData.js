exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from Firestore function (placeholder)" })
  };
};
Add Netlify function getData.js
