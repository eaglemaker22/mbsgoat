const admin = require('firebase-admin');
const serviceAccount = require('./firebase-config-lockmvp.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

module.exports = admin;
