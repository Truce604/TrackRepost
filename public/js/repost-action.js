document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("repost-action-container");
  const db = firebase.firestore();

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      container.innerHTML = "<p>❌ Please log in to see repost opportunities.</p>";
      return;
    }

    const userRef = db.collection("users").doc(user.uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};
    const followers = userData.soundcloud?.followers || 0;
    const baseReward = Math.floor(followers / 100);

    if (baseReward === 0) {
      container.innerHTML = "<p>⚠️ You need at least 100 followers to earn from reposting.</p>";
      return;
    }

    // Enforce repost limit (10 every 12 hours)
    const now = new Date();
    const resetHour = now.getHours() < 12 ? 0 : 12;
    const windowStart = new Date(now);
    windowStart.setHours(resetHour, 0, 0, 0);

    const repostsQuery = db.collection("reposts")
      .where("userId", "==", user.uid)
      .where("timestamp", ">", windowStart);

    const repostsSnap = await repostsQuery.get();
    const regularReposts = repostsSnap.docs.filter(doc => !doc.data().prompted);
    const limitReached = regularReposts.length >= 10;

    if (limitReached) {
      container.innerHTML = "<p>⏳ You've hit your repost limit for now. Try again after 12PM or 12AM.</p>";
      return;
    }

    // Get already reposted campaigns
    const repostedIds = new Set(
      (await db.collection("reposts").where("userId", "==", user.uid).get()).docs.map(doc => doc.data().campaignId)
    );

    // Load available campaigns
    const campaignsSnap = await db.collection("campaigns").get();
    const campaigns = campaignsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(c => !repostedIds.has(c.id) && c.credits >= baseReward);

    if (campaigns.length === 0) {
      container.innerHTML = "<p>🎉 No new campaigns available right now. Check back later!</p>";
      return;
    }

    container.innerHTML = ""; // Clear loading state

    campaigns.forEach(campaign => {
      const card = document.createElement("div");
      card.className = "campaign-card";
      card.innerHTML = `
        <h3>${campaign.genre}</h3>
        <iframe width="100%" height="166" scrolling="no" frameborder="no"
          src="https://w.soundcloud.com/player/?url=${encodeURIComponent(campaign.trackUrl)}&color=%23ff5500">
        </iframe>
        <form class="repost-form">
          <label><input type="checkbox" name="like" checked /> 💖 Like (+1 credit)</label><br>
          <label><input type="checkbox" name="follow" checked /> 👣 Follow (+2 credits)</label><br>
          <label><input type="checkbox" name="comment" /> 💬 Comment (+2 credits)</label><br>
          <input type="text" name="commentText" placeholder="Leave a comment..." />
          <button type="submit">✅ Repost & Earn</button>
          <div class="status"></div>
        </form>
      `;

      const form = card.querySelector(".repost-form");
      const status = card.querySelector(".status");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        form.querySelector("button").disabled = true;
        status.textContent = "Processing...";

        const like = form.like.checked;
        const follow = form.follow.checked;
        const comment = form.comment.checked;
        const commentText = form.commentText.value;
        let totalReward = baseReward;
        if (like) totalReward += 1;
        if (follow) totalReward += 2;
        if (comment && commentText.trim()) totalReward += 2;

        if (campaign.credits < totalReward) {
          status.textContent = "❌ Campaign has insufficient credits.";
          return;
        }

        try {
          await db.collection("reposts").doc(`${user.uid}_${campaign.id}`).set({
            userId: user.uid,
            campaignId: campaign.id,
            trackUrl: campaign.trackUrl,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            prompted: false,
            like,
            follow,
            comment,
            commentText
          });

          await userRef.update({
            credits: (userData.credits || 0) + totalReward
          });

          await db.collection("campaigns").doc(campaign.id).update({
            credits: campaign.credits - totalReward
          });

          await db.collection("transactions").add({
            userId: user.uid,
            type: "earned",
            amount: totalReward,
            reason: `Reposted ${campaign.trackUrl}`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });

          status.textContent = `✅ Reposted! You earned ${totalReward} credits.`;
          form.querySelector("button").disabled = true;
        } catch (err) {
          console.error(err);
          status.textContent = "❌ Error processing repost.";
        }
      });

      container.appendChild(card);
    });
  });
});

