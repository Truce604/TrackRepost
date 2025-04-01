document.addEventListener("DOMContentLoaded", () => {
  const creditDisplay = document.getElementById("creditBalance");
  const statusBox = document.getElementById("status");

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      creditDisplay.textContent = "Please log in to view your credits.";
      return;
    }

    try {
      const userRef = firebase.firestore().collection("users").doc(user.uid);
      const userSnap = await userRef.get();
      const credits = userSnap.exists ? userSnap.data().credits || 0 : 0;
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
        const user = firebase.auth().currentUser;
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
});
