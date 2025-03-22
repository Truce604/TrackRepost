const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

exports.assignCreditsOnSignup = functions.auth.user().onCreate(async (user) => {
  const userId = user.uid;

  try {
    await db.collection('users').doc(userId).set({
      credits: 30,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`✅ 30 credits assigned to user: ${userId}`);
  } catch (error) {
    console.error(`❌ Failed to assign credits: ${error.message}`);
  }
});
