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

// Handle Buy Button Clicks
document.querySelectorAll(".buy-btn").forEach((button) => {
  button.addEventListener("click", async () => {
    const credits = button.dataset.credits;
    const price = button.dataset.price;
    const plan = button.dataset.plan || null;

    statusBox.textContent = "Redirecting to payment...";

    try {
      const user = auth.currentUser;
      if (!user) {
        statusBox.textContent = "You must be logged in.";
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          credits: parseInt(credits),
          amount: parseInt(price),
          plan
        })
      });

      const data = await res.json();
      if (data && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        statusBox.textContent = "❌ Failed to initiate payment.";
      }
    } catch (err) {
      console.error(err);
      statusBox.textContent = "❌ Error redirecting to payment.";
    }
  });
});

