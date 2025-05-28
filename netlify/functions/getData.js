// netlify/functions/getData.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

export default async (req, res) => {
  try {
    const docRef = db.collection('bonds_for_umbs').doc('0RSDuvdCKNIFcY47UzbS');
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.status(200).json(doc.data());
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

