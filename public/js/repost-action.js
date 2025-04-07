const auth = firebase.auth();
const db = firebase.firestore();

const params = new URLSearchParams(window.location.search);
const campaignId = params.get("id");

let currentUser = null;
let campaignData = null;
let scWidget = null;

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    document.body.innerHTML = "<p>Please log in to repost.</p>";
    return;
  }

  currentUser = user;

  try {
    const campaignSnap = await db.collection("campaigns").doc(campaignId).get();
    if (!campaignSnap.exists) {
      document.body.innerHTML = "<p>❌ Campaign not found.</p>";
      return;
    }

    campaignData = campaignSnap.data();

    document.body.innerHTML = `
      <div class="card">
        <img src="${campaignData.artworkUrl}" alt="Artwork" style="width:100%;border-radius:12px;margin-bottom:15px;" />
        <h2>${campaignData.title}</h2>
        <p>👤 ${campaignData.artist}</p>
        <p>🎧 ${campaignData.genre} | 💳 ${campaignData.credits} credits</p>

        <iframe id="sc-player" width="100%" height="140" scrolling="no" frameborder="no"
          src="https://w.soundcloud.com/player/?url=${encodeURIComponent(campaignData.trackUrl)}&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&visual=false"></iframe>

        <form id="engagement-form" style="margin-top:20px;text-align:left;">
          <label><input type="checkbox" id="like" checked /> 💖 Like this track (+1 credit)</label><br/>
          <label><input type="checkbox" id="follow" checked /> 👣 Follow the artist (+2 credits)</label><br/>
          <label><input type="checkbox" id="comment" /> 💬 Leave a comment (+2 credits)</label><br/>
          <textarea id="commentText" placeholder="Write a comment..." style="width:100%;border-radius:8px;margin-top:5px;display:none;"></textarea>
        </form>

        <p id="reward-estimate" style="margin-top:10px;color:#aaa;">Estimated reward: -- credits</p>

        <button id="repost-btn" class="confirm-button" disabled>▶️ Play track to enable repost</button>
      </div>
    `;

    // Load SoundCloud player API
    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.onload = () => {
      const iframe = document.getElementById("sc-player");
      scWidget = SC.Widget(iframe);

      // Enable repost button when track starts
      scWidget.bind(SC.Widget.Events.PLAY, () => {
        const btn = document.getElementById("repost-btn");
        btn.disabled = false;
        btn.textContent = "✅ Repost Now";
        btn.onclick = confirmRepost;
      });
    };
    document.body.appendChild(script);

    // Comment toggle
    document.addEventListener("change", (e) => {
      if (e.target.id === "comment") {
        document.getElementById("commentText").style.display = e.target.checked ? "block" : "none";
      }
      updateEstimatedReward();
    });

    document.addEventListener("input", (e) => {
      if (e.target.id === "commentText") {
        updateEstimatedReward();
      }
    });

  } catch (err) {
    console.error("Error loading campaign:", err);
    document.body.innerHTML = "<p>⚠️ Error loading campaign info.</p>";
  }
});

async function updateEstimatedReward() {
  const userRef = db.collection("users").doc(currentUser.uid);
  const userSnap = await userRef.get();
  const followers = userSnap.data().soundcloud?.followers || 0;
  let total = Math.floor(followers / 100);

  if (document.getElementById("like").checked) total += 1;
  if (document.getElementById("follow").checked) total += 2;
  if (document.getElementById("comment").checked && document.getElementById("commentText").value.trim()) total += 2;

  document.getElementById("reward-estimate").textContent = `Estimated reward: ${total} credits`;
}

async function confirmRepost() {
  const userId = currentUser.uid;

  try {
    const dupes = await db.collection("reposts")
      .where("userId", "==", userId)
      .where("campaignId", "==", campaignId)
      .get();
    if (!dupes.empty) {
      alert("❌ You've already reposted this track.");
      return;
    }

    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const recent = await db.collection("reposts")
      .where("userId", "==", userId)
      .where("timestamp", ">", twelveHoursAgo)
      .get();
    if (recent.size >= 10) {
      alert("🚫 You’ve hit your 10 reposts for this 12-hour window.");
      return;
    }

    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.data();
    const followers = userData.soundcloud?.followers || 0;
    const baseCredits = Math.floor(followers / 100);

    const liked = document.getElementById("like").checked;
    const followed = document.getElementById("follow").checked;
    const commented = document.getElementById("comment").checked;
    const commentText = document.getElementById("commentText").value.trim();

    let earnedCredits = baseCredits;
    if (liked) earnedCredits += 1;
    if (followed) earnedCredits += 2;
    if (commented && commentText) earnedCredits += 2;

    if (earnedCredits <= 0) {
      alert("❌ You must like, follow, comment, or have followers to earn credits.");
      return;
    }

    const campaignRef = db.collection("campaigns").doc(campaignId);
    const repostRef = db.collection("reposts").doc();
    const logRef = db.collection("transactions").doc();
    const ownerRef = db.collection("users").doc(campaignData.userId);

    const batch = db.batch();

    console.log("📝 1. Adding to /reposts...");
    batch.set(repostRef, {
      userId,
      campaignId,
      trackUrl: campaignData.trackUrl,
      liked,
      follow: followed,
      comment: commented,
      commentText,
      timestamp: new Date(),
      prompted: false
    });

    console.log("💳 2. Updating /users credits...");
    batch.update(userRef, {
      credits: firebase.firestore.FieldValue.increment(earnedCredits)
    });

    console.log("📉 3. Updating /campaigns credits...");
    batch.update(campaignRef, {
      credits: firebase.firestore.FieldValue.increment(-earnedCredits)
    });

    console.log("🧾 4. Writing to /transactions...");
    batch.set(logRef, {
      userId,
      type: "earned",
      amount: earnedCredits,
      reason: `Reposted: ${campaignData.title}`,
      timestamp: new Date()
    });

    console.log("🚀 5. Committing batch...");
    await batch.commit();

    alert(`✅ Repost complete! You earned ${earnedCredits} credits.`);
    window.location.href = "dashboard.html";

  } catch (err) {
    console.error("🔥 Repost failed:", err);
    alert("❌ Something went wrong while reposting.");
  }
}
