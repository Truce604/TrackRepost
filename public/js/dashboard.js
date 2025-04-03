document.addEventListener("DOMContentLoaded", () => {
  const creditDisplay = document.getElementById("creditBalance");
  const campaignContainer = document.getElementById("campaigns");
  const userInfo = document.getElementById("userInfo");
  const planBadge = document.getElementById("planBadge");
  const transactionTable = document.getElementById("transactions");
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
    creditDisplay.textContent = `You have ${credits} credits.`;

    planBadge.innerHTML = isPro
      ? `<span class="badge pro">PRO PLAN</span>`
      : `<span class="badge free">FREE PLAN</span>`;

    // 🔄 Load user's campaigns
    const campaignSnap = await db.collection("campaigns")
      .where("userId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .get();

    if (campaignSnap.empty) {
      campaignContainer.innerHTML = `<p>You have no active campaigns yet.</p>`;
    } else {
      campaignContainer.innerHTML = "";
      campaignSnap.forEach(doc => {
        const data = doc.data();
        const div = document.createElement("div");
        div.className = "campaign-card";

        div.innerHTML = `
          <h3>${data.title || "Untitled Track"}</h3>
          <p>🎵 Genre: ${data.genre}</p>
          <p>👤 Artist: ${data.artist}</p>
          <p>💰 Credits Remaining: ${data.credits}</p>
          <img src="${data.artworkUrl}" alt="Artwork" style="width: 200px; border-radius: 10px; margin: 10px 0;" />
          <iframe width="100%" height="166" scrolling="no" frameborder="no"
            src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.trackUrl)}&color=%23ff5500&auto_play=false&show_user=true">
          </iframe>
        `;
        campaignContainer.appendChild(div);
      });
    }

    // 📊 Load transaction history
    const transactionsSnap = await db.collection("transactions")
      .where("userId", "==", user.uid)
      .orderBy("timestamp", "desc")
      .limit(20)
      .get();

    transactionTable.innerHTML = "";

    if (transactionsSnap.empty) {
      transactionTable.innerHTML = "<tr><td colspan='4'>No transactions yet.</td></tr>";
    } else {
      transactionsSnap.forEach(doc => {
        const tx = doc.data();
        const row = document.createElement("tr");
        const date = tx.timestamp?.toDate().toLocaleString() || "Unknown";

        row.innerHTML = `
          <td>${tx.type || "N/A"}</td>
          <td>${tx.amount || 0}</td>
          <td>${tx.reason || "-"}</td>
          <td>${date}</td>
        `;
        transactionTable.appendChild(row);
      });
    }
  });

  // 🔓 Logout handler
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      firebase.auth().signOut().then(() => {
        window.location.href = "index.html";
      });
    });
  }
});



