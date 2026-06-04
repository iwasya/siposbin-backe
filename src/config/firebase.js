const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const parseServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }

    return serviceAccount;
  }

  const localKeyPath = path.join(__dirname, "firebase-key.json");

  if (fs.existsSync(localKeyPath)) {
    return require(localKeyPath);
  }

  return null;
};

const serviceAccount = parseServiceAccount();

if (serviceAccount && admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else if (!serviceAccount) {
  console.warn("Firebase service account is not configured. Push notifications are disabled.");
}

module.exports = admin;
