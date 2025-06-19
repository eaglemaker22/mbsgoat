const adminMBS = require('firebase-admin');
const serviceAccountMBS = require('./firebase-config-mbsgoat.json');

if (!adminMBS.apps.find(app => app.name === 'mbsgoat')) {
  adminMBS.initializeApp(
    {
      credential: adminMBS.credential.cert(serviceAccountMBS)
    },
    'mbsgoat'
  );
}

module.exports = adminMBS;
