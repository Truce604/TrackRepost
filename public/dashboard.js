// ✅ Firebase v8 compatible dashboard.js

firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    const userId = user.uid;
    const displayName = user.displayName || "Friend";

    // Update greeting
    document.getElementById("greeting").textContent = `Welcome, ${displayName}!`;

    // Fetch credits from Firestore
    const db = firebase.firestore();
    db.collection("users").doc(userId).get().then((doc) => {
      if (doc.exists) {
        const data = doc.data();
        document.getElementById("credits").textContent = `Credits: ${data.credits || 0}`;
      } else {
        document.getElementById("credits").textContent = "Credits: 0";
      }
    }).catch((error) => {
      console.error("❌ Error fetching user data:", error);
      document.getElementById("credits").textContent = "Error loading credits.";
    });

  } else {
    // User not logged in
    window.location.href = "/index.html"; // Redirect to login
  }
});

