document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("repost-action-container");
  const db = firebase.firestore();

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      container.innerHTML = "<p>❌ Please log in to see campaigns.</p>";
      return;
    }

    const userRef = db.collection("users").doc(user.uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};
    const followers = userData.soundcloud?.followers || 0;
    const baseReward = Math.floor(followers / 100);

    if (baseReward === 0) {
      container.innerHTML = "<p>⚠️ You need at least 100 SoundCloud followers to earn credits.</p>";
      return;
    }

    const repostSnap = await db.collection("reposts")
      .where("userId", "==", user.uid)
      .get();

    const alreadyReposted = new Set(repostSnap.docs.map(doc => doc.data().campaignId));

    const campaignSnap = await db.collection("campaigns").get();
    const campaigns = campaignSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(c => !alreadyReposted.has(c.id) && c.credits >= baseReward);

    if (campaigns.length === 0) {
      container.innerHTML = "<p>🎉 No repostable campaigns at this time. Check back soon!</p>";
      return;
    }

    container.innerHTML = "";
    campaigns.forEach(data => {
      const card = document.createElement("div");
      card.className = "campaign-card";
      card.style.marginBottom = "30px";
      card.style.border = "1px solid #ddd";
      card.style.borderRadius = "12px";
      card.style.padding = "15px";
      card.style.backgroundColor = "#fff";
      card.style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)";

      card.innerHTML = `
        <div style="display: flex; gap: 20px;">
          <img src="${data.artworkUrl || '/assets/default-artwork.png'}" alt="Artwork" style="width: 100px; height: 100px; border-radius: 8px;" />
          <div style="flex: 1;">
            <h3 style="margin: 0;">${data.title || "Untitled Track"}</h3>
            <p style="margin: 2px 0; color: #555;"><strong>Artist:</strong> ${data.artist || "Unknown"}</p>
            <p style="margin: 2px 0;"><strong>Genre:</strong> ${data.genre}</p>
            <p style="margin: 2px 0;"><strong>Credits Remaining:</strong> ${data.credits}</p>
            <iframe width="100%" height="100" scrolling="no" frameborder="no"
              src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.trackUrl)}&color=%23ff5500&inverse=false&auto_play=false&show_user=true">
            </iframe>
            <form class="repost-form" style="margin-top: 10px;">
              <label><input type="checkbox" class="like" checked /> 💖 Like this track (+1 credit)</label><br>
              <label><input type="checkbox" class="follow" checked /> 👣 Follow the artist (+2 credits)</label><br>
              <label><input type="checkbox" class="comment" /> 💬 Leave a comment (+2 credits)</label><br>
              <input type="text" class="commentText" placeholder="Enter your comment here..." style="width: 100%; margin-top: 5px;" />
              <button type="submit" style="margin-top: 10px;">✅ Complete Repost & Earn</button>
              <div class="status-message" style="margin-top: 8px; font-weight: bold;"></div>
            </form>
          </div>
        </div>
      `;

      const form = card.querySelector(".repost-form");
      const status = form.querySelector(".status-message");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        form.querySelector("button").disabled = true;
        status.textContent = "Processing...";

        const like = form.querySelector(".like").checked;
        const follow = form.querySelector(".follow").checked;
        const comment = form.querySelector(".comment").checked;
        const commentText = form.querySelector(".commentText").value.trim();

        let totalReward = baseReward;
        if (like) totalReward += 1;
        if (follow) totalReward += 2;
        if (comment && commentText) totalReward += 2;

        const now = new Date();
        const resetHour = now.getHours() < 12 ? 0 : 12;
        const windowStart = new Date(now);
        windowStart.setHours(resetHour, 0, 0, 0);

        const repostsQuery = db.collection("reposts")
          .where("userId", "==", user.uid)
          .where("timestamp", ">", windowStart);

        const repostsSnap = await repostsQuery.get();
        const regularReposts = repostsSnap.docs.filter(doc => !doc.data().prompted);

        if (regularReposts.length >= 10) {
          status.textContent = "⏳ You've hit your 12-hour repost limit. Try again later.";
          return;
        }

        const campaignRef = db.collection("campaigns").doc(data.id);
        const campaignSnap = await campaignRef.get();
        const campaign = campaignSnap.data();

        if (campaign.credits < totalReward) {
          status.textContent = "❌ Not enough credits in campaign.";
          return;
        }

        await db.collection("reposts").doc(`${user.uid}_${data.id}`).set({
          userId: user.uid,
          campaignId: data.id,
          trackUrl: data.trackUrl,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          prompted: false,
          like,
          follow,
          comment,
          commentText
        });

        await db.collection("users").doc(user.uid).update({
          credits: (userData.credits || 0) + totalReward
        });

        await campaignRef.update({
          credits: campaign.credits - totalReward
        });

        await db.collection("transactions").add({
          userId: user.uid,
          type: "earned",
          amount: totalReward,
          reason: `Reposted ${data.trackUrl}`,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        status.textContent = `✅ Reposted! You earned ${totalReward} credits.`;
      });

      container.appendChild(card);
    });
  });
});


