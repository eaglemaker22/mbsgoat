// netlify/functions/getData.js

// Use require() for imports
const admin = require('firebase-admin'); // This imports the entire firebase-admin package

// IMPORTANT: Ensure FIREBASE_SERVICE_ACCOUNT_KEY is set as an environment variable in Netlify.
// This variable should contain the entire JSON content of your firebase_key.json file,
// stringified into a single line.
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
    // Query the 'mbs_quotes' collection
    // Order by 'timestamp' in descending order to get the most recent document first
    // Limit to 1 document to get only the latest entry
    const snapshot = await db.collection('mbs_quotes')
                              .orderBy('timestamp', 'desc') // Assuming 'timestamp' field exists and is consistently formatted
                              .limit(1)
                              .get();

    if (snapshot.empty) {
      // If no documents are found in 'mbs_quotes' collection
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No MBS quotes found in Firestore' }),
      };
    }

    // Get the data from the first (and only) document in the snapshot
    const latestDoc = snapshot.docs[0];
    const data = latestDoc.data();

    // Return the document data as JSON
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) { // Use 'error' instead of 'err' for consistency
    console.error("Function error:", error); // Log the error for debugging
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
    };
  }
};