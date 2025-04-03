document.addEventListener("DOMContentLoaded", () => {
  const creditDisplay = document.getElementById("creditBalance");
  const campaignContainer = document.getElementById("campaigns");
  const userInfo = document.getElementById("userInfo");
  const planBadge = document.getElementById("planBadge");
  const logoutBtn = document.getElementById("logout-btn");

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      userInfo.textContent = "Please log in to view your dashboard.";
      return;
    }

    const db = firebase.firestore();
    const userRef = db.collection("users").doc(user.uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};
    const credits = userData.credits || 0;
    const isPro = userData.isPro || false;

    userInfo.textContent = `Welcome, ${user.displayName || "User"}!`;
    creditDisplay.textContent = `${credits} credits`;

    // Show plan badge
    planBadge.innerHTML = isPro
      ? `<span class="badge pro">PRO PLAN</span>`
      : `<span class="badge free">FREE PLAN</span>`;

    // Load campaigns
    const q = db.collection("campaigns").where("userId", "==", user.uid);
    const snapshot = await q.get();

    if (snapshot.empty) {
      campaignContainer.innerHTML = `<p>No active campaigns yet.</p>`;
    } else {
      campaignContainer.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const div = document.createElement("div");
        div.className = "campaign-card";
        div.innerHTML = `
          <h3>${data.genre}</h3>
          <p><strong>${data.title}</strong> by ${data.artist}</p>
          <img src="${data.artworkUrl}" alt="Artwork" style="max-width: 100%; border-radius: 10px; margin: 10px 0;">
          <p><a href="track-details.html?id=${doc.id}" class="button">🎧 View Details</a></p>
          <p>Credits Remaining: ${data.credits}</p>
        `;
        campaignContainer.appendChild(div);
      });
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      firebase.auth().signOut().then(() => {
        window.location.href = "index.html";
      });
    });
  }
});




