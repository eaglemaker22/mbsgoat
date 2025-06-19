const admin = require('./firebase-lockmvp');
const db = admin.firestore();

exports.handler = async function (event, context) {
  try {
    const snapshot = await db.collection('bonds_for_umbs').doc('latest').get();

    if (!snapshot.exists) {
      return { statusCode: 404, body: 'US10Y data not found' };
    }

    const data = snapshot.data();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error('US10Y Error:', err);
    return { statusCode: 500, body: 'Failed to retrieve US10Y data' };
  }
};
