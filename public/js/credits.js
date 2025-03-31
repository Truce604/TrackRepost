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

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const credits = userSnap.exists() ? userSnap.data().credits || 0 : 0;
    creditDisplay.textContent = `You currently have ${credits} credits.`;
  } catch (err) {
    creditDisplay.textContent = "Error loading credits.";
    console.error(err);
  }
});

document.querySelectorAll(".buy-btn").forEach((button) => {
  button.addEventListener("click", async () => {
    const credits = parseInt(button.dataset.credits);
    const amount = parseInt(button.dataset.price);
    const plan = button.dataset.plan || null;

    statusBox.textContent = "Redirecting to payment...";

    try {
      const user = auth.currentUser;
      if (!user) {
        statusBox.textContent = "❌ You must be logged in.";
        return;
      }

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

      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Checkout error:", errorText);
        statusBox.textContent = "❌ Payment failed: " + errorText;
        return;
      }

      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          statusBox.textContent = "❌ Failed to start payment session.";
        }
      } else {
        const errorText = await res.text();
        console.error("❌ Non-JSON response:", errorText);
        statusBox.textContent = "❌ Unexpected server response.";
      }
    } catch (err) {
      console.error("❌ Network error:", err);
      statusBox.textContent = "❌ Could not connect to payment server.";
    }
  });
});


