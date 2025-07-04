const admin = require("firebase-admin");

// Only initialize once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();


exports.handler = async (event, context) => {
  try {
    console.log("🚀 Starting to update 'yesterday' fields...");

    // Reference the collection that holds your mortgage rate documents
    const collectionRef = db.collection("fred_reports");

    // List of document IDs you want to update
    const docIds = [
      "30Y Fixed Rate Conforming",
      "30Y VA Mortgage Index",
      "30Y FHA Mortgage Index",
      "30Y Jumbo Mortgage Index",
      "30Y USDA Mortgage Index",
      "15Y Mortgage Avg US"
    ];

    for (const docId of docIds) {
      const docRef = collectionRef.doc(docId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const data = docSnap.data();
        const latest = data.latest || null;
        const latest_date = data.latest_date || null;

        if (latest !== null && latest_date) {
          console.log(`✅ Updating ${docId}: ${latest} (${latest_date})`);

          await docRef.update({
            yesterday: latest,
            yesterday_date: latest_date
          });
        } else {
          console.warn(`⚠️ Skipped ${docId}: Missing latest or latest_date`);
        }
      } else {
        console.warn(`⚠️ Document not found: ${docId}`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Yesterday fields updated successfully." })
    };
  } catch (err) {
    console.error("❌ Error updating yesterday fields:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
