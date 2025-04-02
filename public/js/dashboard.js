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

    const q = db.collection("campaigns").where("userId", "==", user.uid);
    const snapshot = await q.get();

    if (snapshot.empty) {
      campaignContainer.innerHTML = `<p>No active campaigns yet.</p>`;
    } else {
      campaignContainer.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const card = document.createElement("div");
        card.className = "campaign-card";
        card.style.marginBottom = "20px";
        card.style.border = "1px solid #ccc";
        card.style.borderRadius = "10px";
        card.style.padding = "15px";
        card.style.backgroundColor = "#fff";
        card.style.boxShadow = "0 4px 8px rgba(0,0,0,0.05)";

        card.innerHTML = `
          <div style="display: flex; gap: 15px;">
            <img src="${data.artworkUrl || '/assets/default-artwork.png'}" alt="Artwork" style="width: 100px; height: 100px; border-radius: 8px;" />
            <div>
              <h3 style="margin: 0 0 5px 0;">${data.title || "Untitled Track"}</h3>
              <p style="margin: 0; color: #555;"><strong>Artist:</strong> ${data.artist || "Unknown"}</p>
              <p style="margin: 4px 0;"><strong>Genre:</strong> ${data.genre}</p>
              <p style="margin: 4px 0;"><strong>Credits Remaining:</strong> ${data.credits}</p>
              <a href="${data.trackUrl}" target="_blank">🎧 Listen on SoundCloud</a>
            </div>
          </div>
        `;

        campaignContainer.appendChild(card);
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

