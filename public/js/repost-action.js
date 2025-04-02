document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("repost-action-container");
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get("id");

  if (!campaignId) {
    container.innerHTML = "<p>❌ Missing campaign ID.</p>";
    return;
  }

  const db = firebase.firestore();

  const buildRepostUI = (data) => {
    container.innerHTML = `
      <h2>${data.genre} – Earn Credits!</h2>
      <iframe width="100%" height="166" scrolling="no" frameborder="no"
        src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.trackUrl)}&color=%23ff5500&inverse=false&auto_play=false&show_user=true">
      </iframe>

      <form id="repost-options" class="campaign-form">
        <label><input type="checkbox" id="like" checked /> 💖 Like this track (+1 credit)</label><br>
        <label><input type="checkbox" id="follow" checked /> 👣 Follow the artist (+2 credits)</label><br>
        <label><input type="checkbox" id="comment" /> 💬 Leave a comment (+2 credits)</label><br>
        <input type="text" id="commentText" placeholder="Enter your comment here..." />
        <button type="submit">✅ Complete Repost & Earn</button>
      </form>

      <div id="status" class="status-message"></div>
    `;

    const form = document.getElementById("repost-options");
    const status = document.getElementById("status");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      form.querySelector("button").disabled = true;
      status.textContent = "Checking repost limits...";

      firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
          status.textContent = "❌ You must be logged in.";
          return;
        }

        const repostRef = db.collection("reposts").doc(`${user.uid}_${campaignId}`);
        const repostSnap = await repostRef.get();

        if (repostSnap.exists) {
          status.textContent = "⚠️ You already reposted this track.";
          return;
        }

        const userRef = db.collection("users").doc(user.uid);
        const userSnap = await userRef.get();
        const userData = userSnap.exists ? userSnap.data() : {};
        const followers = userData.soundcloud?.followers || 0;
        const baseReward = Math.floor(followers / 100);

        if (baseReward === 0) {
          status.textContent = "❌ You need at least 100 followers to earn from reposting.";
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
          status.textContent = `❌ Not enough campaign credits to pay you (${totalReward} needed).`;
          return;
        }

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
          status.textContent = "⏳ You've hit your repost limit for now. Try again later.";
          return;
        }

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

        await userRef.update({
          credits: (userData.credits || 0) + totalReward
        });

        await db.collection("campaigns").doc(campaignId).update({
          credits: data.credits - totalReward
        });

        await db.collection("transactions").add({
          userId: user.uid,
          type: "earned",
          amount: totalReward,
          reason: `Reposted ${data.trackUrl}`,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        status.textContent = `✅ Repost complete! You earned ${totalReward} credits.`;
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

      const data = docSnap.data();
      buildRepostUI(data);
    } catch (err) {
      console.error("Error loading campaign:", err);
      container.innerHTML = "<p>❌ Failed to load campaign.</p>";
    }
  };

  loadCampaign();
});

