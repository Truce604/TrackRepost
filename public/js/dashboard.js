// ✅ Dashboard Script
document.addEventListener("DOMContentLoaded", () => {
  const creditDisplay = document.getElementById("creditBalance");
  const campaignContainer = document.getElementById("campaigns");
  const userInfo = document.getElementById("userInfo");
  const planBadge = document.getElementById("planBadge");

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

    userInfo.innerHTML = `
      <strong>Welcome, ${user.displayName || "User"}</strong>
    `;
    creditDisplay.innerHTML = `<span>${credits} credits</span>`;
    planBadge.innerHTML = `<span class="badge ${isPro ? "pro" : "free"}">${plan.toUpperCase()} PLAN</span>`;

    const campaignSnap = await db.collection("campaigns")
      .where("userId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .get();

    if (campaignSnap.empty) {
      campaignContainer.innerHTML = `<p>No active campaigns yet. <a href="submit-campaign.html">Start one here</a>.</p>`;
    } else {
      campaignContainer.innerHTML = "";
      campaignSnap.forEach(doc => {
        const data = doc.data();
        const campaignId = doc.id;

        const div = document.createElement("div");
        div.className = "campaign-card";
        div.innerHTML = `
          <img src="${data.artworkUrl}" alt="Track Art" class="campaign-art" />
          <div class="campaign-info">
            <h3>${data.title || "Untitled Track"}</h3>
            <p><strong>Genre:</strong> ${data.genre}</p>
            <p><strong>Credits Left:</strong> ${data.credits}</p>
            <a href="${data.trackUrl}" target="_blank">🔗 Listen on SoundCloud</a><br/>
            <a href="track-details.html?id=${campaignId}" class="details-link">📊 View Repost Activity</a>
          </div>
        `;
        campaignContainer.appendChild(div);
      });
    }
  });
});




