// /js/credits.js
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth-compat.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore-compat.js";

const auth = getAuth();
const db = getFirestore();

let currentUser = null;

// ✅ Auth & display current credits
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    document.getElementById("creditBalance").textContent = "Please log in.";
    return;
  }

  currentUser = user;

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  const userData = snap.data();

  document.getElementById("creditBalance").textContent =
    `You currently have ${userData.credits || 0} credits.`;
});

// ✅ Attach logic to all .buy-btn buttons
document.querySelectorAll(".buy-btn").forEach((button) => {
  button.addEventListener("click", async () => {
    if (!currentUser) {
      alert("Please log in to buy credits.");
      return;
    }

    const credits = parseInt(button.dataset.credits, 10);
    const price = parseInt(button.dataset.price, 10); // not used, but passed in case
    const plan = button.dataset.plan || null;

    const userId = currentUser.uid;

    document.getElementById("status").textContent = "Redirecting to payment...";

    try {
      const response = await fetch("/api/square/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credits,
          userId,
          plan,
        }),
      });

      const { checkoutUrl } = await response.json();

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        document.getElementById("status").textContent = "❌ Failed to create checkout session.";
      }
    } catch (err) {
      console.error("❌ Error creating checkout:", err);
      document.getElementById("status").textContent = "❌ Something went wrong. Please try again.";
    }
  });
});

