import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
initializeApp({
  credential: applicationDefault()
});

const db = getFirestore();

async function assignCreditsToNewUsers() {
  try {
    const usersSnapshot = await db.collection("users").get();

    const batch = db.batch();

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();

      // Only update users who don't have a credits field
      if (userData.credits === undefined) {
        const userRef = db.collection("users").doc(doc.id);
        batch.update(userRef, {
          credits: 30
        });
        console.log(`✅ Assigned 30 credits to user: ${doc.id}`);
      }
    });

    await batch.commit();
    console.log("🎉 Done assigning credits to new users!");
  } catch (error) {
    console.error("❌ Error assigning credits:", error);
  }
}

assignCreditsToNewUsers();
