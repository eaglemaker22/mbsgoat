// netlify/functions/getData.js

// Use require() for imports
const admin = require('firebase-admin'); // This imports the entire firebase-admin package
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Initialize Firebase Admin SDK
// Check if app is already initialized to prevent errors on hot reloads in development
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore(); // Access firestore from the admin object

// This is the handler function that Netlify expects
exports.handler = async function(event, context) {
  try {
    // The event object contains details about the request (like query parameters, body)
    // The context object contains information about the invocation, function, and execution environment.

    const docRef = db.collection('bonds_for_umbs').doc('0RSDuvdCKNIFcY47UzbS');
    const doc = await docRef.get();

    if (!doc.exists) {
      // Netlify Functions return an object with statusCode and body
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Document not found' }),
      };
    }

    // Return the document data as JSON
    return {
      statusCode: 200,
      body: JSON.stringify(doc.data()),
    };
  } catch (error) { // Use 'error' instead of 'err' for consistency
    console.error("Function error:", error); // Log the error for debugging
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
    };
  }
};
