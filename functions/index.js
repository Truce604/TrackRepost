const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.assignCreditsOnSignup = functions.auth.user().onCreate(async (user) => {
  const userRef = db.collection("users").doc(user.uid);
  await userRef.set({
    email: user.email || null,
    credits: 30,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});

exports.squareWebhook = require("./squareWebhook").squareWebhook;


