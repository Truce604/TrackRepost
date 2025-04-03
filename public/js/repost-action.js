document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("track-info");
  const form = document.getElementById("repost-form");
  const status = document.getElementById("status");

  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get("id");
  const db = firebase.firestore();

  if (!campaignId) {
    container.innerHTML = "<p>❌ No campaign ID found in URL.</p>";
    return;
  }

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      container.innerHTML = "<p>❌ You must be logged in to repost.</p>";
      return;
    }

    try {
      const campaignSnap = await db.collection("campaigns").doc(campaignId).get();
      if (!campaignSnap.exists) {
        container.innerHTML = "<p>❌ Campaign not found.</p>";
        return;
      }

      const campaign = campaignSnap.data();
      const userSnap = await db.collection("users").doc(user.uid).get();
      const userData = userSnap.data() || {};
      const followers = userData.soundcloud?.followers || 0;

      const baseReward = Math.floor(followers / 100);
      if (baseReward < 1) {
        container.innerHTML = "<p>❌ You need at least 100 followers to earn credits from reposting.</p>";
        return;
      }

      container.innerHTML = `
        <h3>${campaign.title || "Untitled"} <span style="font-weight: normal;">by</span> ${campaign.artist || "Unknown"}</h3>
        <p><strong>Genre:</strong> ${campaign.genre}</p>
        <p><strong>Credits Available:</strong> ${campaign.credits}</p>
        <iframe scrolling="no" frameborder="no" allow="autoplay"
          src="https://w.soundcloud.com/player/?url=${encodeURIComponent(campaign.trackUrl)}&color=%23ff5500&auto_play=false&show_user=true"></iframe>
      `;

      form.style.display = "block";

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        status.textContent = "⏳ Processing your repost...";
        form.querySelector("button").disabled = true;

        const repostRef = db.collection("reposts").doc(`${user.uid}_${campaignId}`);
        const repostSnap = await repostRef.get();
        if (repostSnap.exists) {
          status.textContent = "⚠️ You already reposted this track.";
          return;
        }

        // Check repost limits
        const now = new Date();
        const startHour = now.getHours() < 12 ? 0 : 12;
        const windowStart = new Date();
        windowStart.setHours(startHour, 0, 0, 0);

        const repostsSnap = await db.collection("reposts")
          .where("userId", "==", user.uid)
          .where("timestamp", ">", firebase.firestore.Timestamp.fromDate(windowStart))
          .get();

        const regularReposts = repostsSnap.docs.filter(doc => !doc.data().prompted);
        if (regularReposts.length >= 10) {
          status.textContent = "⏳ You've hit your repost limit for now. Try again later.";
          return;
        }

        // Calculate reward
        const like = document.getElementById("like").checked;
        const follow = document.getElementById("follow").checked;
        const comment = document.getElementById("comment").checked;
        const commentText = document.getElementById("commentText").value;

        let totalReward = baseReward;
        if (like) totalReward += 1;
        if (follow) totalReward += 2;
        if (comment && commentText.trim()) totalReward += 2;

        if (campaign.credits < totalReward) {
          status.textContent = `❌ Campaign doesn't have enough credits to pay you (${totalReward} required).`;
          return;
        }

        // Update Firestore
        await db.collection("reposts").doc(`${user.uid}_${campaignId}`).set({
          userId: user.uid,
          campaignId,
          trackUrl: campaign.trackUrl,
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

        await db.collection("campaigns").doc(campaignId).update({
          credits: campaign.credits - totalReward
        });

        await db.collection("transactions").add({
          userId: user.uid,
          type: "earned",
          amount: totalReward,
          reason: `Reposted ${campaign.title || campaign.trackUrl}`,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        status.textContent = `✅ Success! You earned ${totalReward} credits for reposting.`;
      });

    } catch (err) {
      console.error("❌ Repost error:", err);
      container.innerHTML = "<p>❌ Something went wrong loading the campaign.</p>";
    }
  });
});



