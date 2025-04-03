document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("repost-action-container");
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get("id");

  if (!campaignId) {
    container.innerHTML = "<p>❌ Missing campaign ID.</p>";
    return;
  }

  const db = firebase.firestore();

  const buildUI = (data) => {
    container.innerHTML = `
      <h2>${data.title || "Untitled Track"}</h2>
      <p>👤 ${data.artist || "Unknown Artist"} | 🎵 ${data.genre}</p>
      <p>🔥 ${data.credits} credits remaining</p>
      <img src="${data.artworkUrl || '/assets/default-art.png'}" alt="Artwork" style="width: 200px; border-radius: 10px;" />

      <iframe width="100%" height="166" scrolling="no" frameborder="no"
        src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.trackUrl)}&color=%23ff5500&auto_play=false&show_user=true">
      </iframe>

      <form id="repost-options" class="campaign-form">
        <label><input type="checkbox" id="like" checked /> 💖 Like (+1 credit)</label><br>
        <label><input type="checkbox" id="follow" checked /> 👣 Follow (+2 credits)</label><br>
        <label><input type="checkbox" id="comment" /> 💬 Comment (+2 credits)</label><br>
        <input type="text" id="commentText" placeholder="Leave a comment..." />
        <button type="submit">✅ Repost & Earn</button>
      </form>

      <div id="status" class="status-message"></div>
    `;

    const form = document.getElementById("repost-options");
    const status = document.getElementById("status");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      form.querySelector("button").disabled = true;
      status.textContent = "⏳ Checking eligibility...";

      firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
          status.textContent = "❌ You must be signed in.";
          return;
        }

        const repostRef = db.collection("reposts").doc(`${user.uid}_${campaignId}`);
        const repostSnap = await repostRef.get();

        if (repostSnap.exists) {
          status.textContent = "⚠️ You've already reposted this track.";
          return;
        }

        const userRef = db.collection("users").doc(user.uid);
        const userSnap = await userRef.get();
        const userData = userSnap.exists ? userSnap.data() : {};
        const followers = userData.soundcloud?.followers || 0;
        const baseReward = Math.floor(followers / 100);

        if (baseReward < 1) {
          status.textContent = "❌ You need at least 100 SoundCloud followers to earn.";
          return;
        }

        const like = document.getElementById("like").checked;
        const follow = document.getElementById("follow").checked;
        const comment = document.getElementById("comment").checked;
        const commentText = document.getElementById("commentText").value;

        let totalReward = baseReward;
        if (like) totalReward += 1;
        if (follow) totalReward += 2;
        if (comment && commentText.trim()) totalReward += 2;

        if (data.credits < totalReward) {
          status.textContent = `❌ Not enough credits in campaign (${totalReward} needed).`;
          return;
        }

        // Enforce repost limit: max 10 every 12 hours
        const now = new Date();
        const resetHour = now.getHours() < 12 ? 0 : 12;
        const resetTime = new Date();
        resetTime.setHours(resetHour, 0, 0, 0);

        const repostsQuery = db.collection("reposts")
          .where("userId", "==", user.uid)
          .where("timestamp", ">", firebase.firestore.Timestamp.fromDate(resetTime));

        const repostsSnap = await repostsQuery.get();
        const regularReposts = repostsSnap.docs.filter(doc => !doc.data().prompted);

        if (regularReposts.length >= 10) {
          status.textContent = "⏳ You've hit your repost limit for now (10 per 12 hours).";
          return;
        }

        // Log repost
        await repostRef.set({
          userId: user.uid,
          campaignId,
          trackUrl: data.trackUrl,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          prompted: false,
          like,
          follow,
          comment,
          commentText
        });

        // Update user credits
        await userRef.update({
          credits: (userData.credits || 0) + totalReward
        });

        // Deduct from campaign
        await db.collection("campaigns").doc(campaignId).update({
          credits: data.credits - totalReward
        });

        // Log transaction
        await db.collection("transactions").add({
          userId: user.uid,
          type: "earned",
          amount: totalReward,
          reason: `Reposted ${data.trackUrl}`,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        status.textContent = `✅ Success! You earned ${totalReward} credits.`;
      });
    });
  };

  const loadCampaign = async () => {
    try {
      const docSnap = await db.collection("campaigns").doc(campaignId).get();
      if (!docSnap.exists) {
        container.innerHTML = "<p>❌ Campaign not found.</p>";
        return;
      }
      buildUI(docSnap.data());
    } catch (err) {
      console.error("❌ Load failed:", err);
      container.innerHTML = "<p>❌ Error loading campaign.</p>";
    }
  };

  loadCampaign();
});



