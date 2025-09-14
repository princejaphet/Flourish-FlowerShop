
const admin = require('firebase-admin');


const serviceAccount = require('../make-admin/serviceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const uid = 'nEVf6hCFk8aeynpzKXwCfcT5iVD2'; 

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`✅ Success! User ${uid} has been made an admin.`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error setting custom claims:', error);
    process.exit(1);
  });