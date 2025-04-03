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

    planBadge.innerHTML = isPro
      ? `<span class="badge pro">PRO PLAN</span>`
      : `<span class="badge free">FREE PLAN</span>`;

    const snapshot = await db.collection("campaigns")
      .where("userId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .get();

    if (snapshot.empty) {
      campaignContainer.innerHTML = `<p>No active campaigns yet.</p>`;
      return;
    }

    campaignContainer.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const artwork = data.artworkUrl || "/images/placeholder-artwork.jpg";

      const div = document.createElement("div");
      div.className = "campaign-card";
      div.innerHTML = `
        <img src="${artwork}" alt="Artwork" style="width:100%; height:200px; object-fit:cover; border-radius:8px;">
        <h3>${data.title || "Untitled"}</h3>
        <p>🎧 ${data.artist || "Unknown Artist"}</p>
        <p>🎵 Genre: ${data.genre}</p>
        <p>🔥 Credits Remaining: ${data.credits}</p>
        <a href="repost-action.html?id=${doc.id}" class="button">View Campaign</a>
      `;
      campaignContainer.appendChild(div);
    });
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      firebase.auth().signOut().then(() => {
        window.location.href = "index.html";
      });
    });
  }
});





