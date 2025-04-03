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

    const campaignQuery = db.collection("campaigns").where("userId", "==", user.uid);
    const campaignSnap = await campaignQuery.get();

    if (campaignSnap.empty) {
      campaignContainer.innerHTML = `<p>You have no active campaigns yet.</p>`;
    } else {
      campaignContainer.innerHTML = "";
      campaignSnap.forEach((doc) => {
        const data = doc.data();
        const div = document.createElement("div");
        div.classList.add("campaign");

        div.innerHTML = `
          <iframe width="100%" height="166" scrolling="no" frameborder="no"
            src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.trackUrl)}&color=%23ff5500&auto_play=false&show_user=true">
          </iframe>
          <div class="info">
            <h2>${data.title}</h2>
            <p>by ${data.artist} • ${data.genre} • ${data.credits} credits left</p>
            <a class="button" href="/repost-action.html?id=${doc.id}">🔁 View Repost Page</a>
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



