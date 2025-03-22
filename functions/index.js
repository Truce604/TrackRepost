const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// ✅ Make sure this is exactly `functions.auth.user()`
exports.assignCreditsOnSignup = functions.auth.user().onCreate(async (user) => {
  const userId = user.uid;
  const displayName = user.displayName || "New User";

  try {
    await admin.firestore().collection("users").doc(userId).set({
      credits: 30,
      displayName: displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Assigned 30 credits to ${userId}`);
  } catch (error) {
    console.error(`❌ Error assigning credits to ${userId}:`, error);
  }
});
