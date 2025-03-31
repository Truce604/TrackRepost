const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Assign 30 credits to new users
exports.assignCreditsOnSignup = functions.auth.user().onCreate(async (user) => {
  const userRef = db.collection("users").doc(user.uid);
  await userRef.set({
    email: user.email || null,
    credits: 30,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});

// Square payment webhook
exports.squareWebhook = require("./squareWebhook").squareWebhook;

