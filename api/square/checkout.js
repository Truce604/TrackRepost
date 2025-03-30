// public/js/credits.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase config
import { firebaseConfig } from "../firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const creditDisplay = document.getElementById("creditBalance");
const statusBox = document.getElementById("status");

// Show current credits
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    creditDisplay.textContent = "Please log in to view your credits.";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const credits = userSnap.exists() ? userSnap.data().credits || 0 : 0;
  creditDisplay.textContent = `You currently have ${credits} credits.`;
});

// Handle credit purchase
document.querySelectorAll(".buy-btn").forEach((button) => {
  button.addEventListener("click", async () => {
    const credits = parseInt(button.dataset.credits);
    const amount = parseInt(button.dataset.price); // In cents
    const plan = button.dataset.plan || null;

    statusBox.textContent = "Redirecting to payment...";

    try {
      const user = auth.currentUser;
      if (!user) {
        statusBox.textContent = "❌ You must be logged in.";
        return;
      }

      // Debug log
      console.log("Creating checkout for:", {
        userId: user.uid,
        credits,
        amount,
        plan
      });

      const res = await fetch("/api/square/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          credits,
          amount,
          plan
        })
      });

      const data = await res.json();

      if (data && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        console.error("Checkout failed response:", data);
        statusBox.textContent = "❌ Failed to initiate payment.";
      }
    } catch (err) {
      console.error("Checkout error:", err);
      statusBox.textContent = "❌ Error redirecting to payment.";
    }
  });
});





