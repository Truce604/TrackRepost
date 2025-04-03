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
    const plan = userData.plan || "Free";

    // Display user info
    userInfo.textContent = `Welcome, ${user.displayName || "User"}!`;
    creditDisplay.textContent = `${credits} credits`;

    // Plan badge
    planBadge.innerHTML = isPro
      ? `<span class="badge pro">${plan.toUpperCase()} PLAN</span>`
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

        div.style = `
          border: 1px solid #333;
          background-color: #1e1e1e;
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 20px;
          color: #fff;
          max-width: 650px;
          display: flex;
          gap: 16px;
          align-items: center;
          height: 120px;
          overflow: hidden;
        `;

        div.innerHTML = `
          <img src="${data.artworkUrl || '/assets/default-art.png'}" alt="Artwork" style="width:100px; height:100px; border-radius:8px; object-fit:cover;" />
          <div style="flex:1; overflow:hidden;">
            <h3 style="margin:0; font-size:16px;">${data.title || "Untitled"}</h3>
            <p style="margin:4px 0; font-size:14px;">👤 <strong>${data.artist || "Unknown Artist"}</strong></p>
            <p style="margin:4px 0; font-size:14px;">🎵 ${data.genre}</p>
            <p style="margin:4px 0; font-size:14px;">🔥 ${data.credits} Credits</p>
            <a href="${data.trackUrl}" target="_blank" style="color:#ff8800; font-size:14px;">▶️ Listen on SoundCloud</a>
          </div>
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



