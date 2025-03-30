import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase config
import { firebaseConfig } from "../firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const buyBtn = document.getElementById("buy-pro-btn");
const statusBox = document.getElementById("status");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    buyBtn.disabled = true;
    statusBox.textContent = "❌ Please sign in to upgrade.";
    return;
  }

  // Optional: Check if already Pro
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data().isPro) {
    statusBox.textContent = "✅ You're already a Pro member!";
    buyBtn.disabled = true;
    return;
  }

  buyBtn.addEventListener("click", async () => {
    statusBox.textContent = "⏳ Processing your upgrade...";

    try {
      // Here you’d hook in Stripe or Square real payment flow
      // For now, simulate a successful upgrade:
      await updateDoc(userRef, {
        isPro: true,
        proSince: new Date().toISOString()
      });

      statusBox.textContent = "🎉 You're now a Pro member! Enjoy the perks.";
      buyBtn.disabled = true;
    } catch (err) {
      console.error(err);
      statusBox.textContent = "❌ Upgrade failed. Please try again.";
    }
  });
});
