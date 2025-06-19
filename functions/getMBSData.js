const admin = require('./firebase-lockmvp');
const db = admin.firestore();

exports.handler = async function (event, context) {
  try {
    const snapshot = await db.collection('mbs_data').doc('latest').get();

    if (!snapshot.exists) {
      return { statusCode: 404, body: 'MBS data not found' };
    }

    const data = snapshot.data();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error('MBS Data Error:', err);
    return { statusCode: 500, body: 'Failed to retrieve MBS data' };
  }
};
