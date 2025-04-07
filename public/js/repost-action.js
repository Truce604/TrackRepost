const auth = firebase.auth();
const db = firebase.firestore();

const params = new URLSearchParams(window.location.search);
const campaignId = params.get("id");
const liked = params.get("like") === "true";
const comment = params.get("comment") || "";

let currentUser = null;
let campaignData = null;

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
        <p>👍 Like: <strong>${liked ? "Yes (+1 credit)" : "No"}</strong></p>
        <p>💬 Comment: <em>${comment ? `"${comment}" (+2 credits)` : "None"}</em></p>
        <button class="confirm-button" onclick="confirmRepost()">Repost Now</button>
      </div>
    `;
  } catch (err) {
    console.error("Error loading campaign:", err);
    document.body.innerHTML = "<p>⚠️ Error loading campaign info.</p>";
  }
});

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
    const repostCredits = Math.floor(followers / 100);
    const earnedCredits = repostCredits + (liked ? 1 : 0) + (comment ? 2 : 0);

    if (earnedCredits <= 0) {
      alert("❌ You must like, comment, or have followers to earn credits.");
      return;
    }

    const ownerRef = db.collection("users").doc(campaignData.userId);
    const campaignRef = db.collection("campaigns").doc(campaignId);
    const logRef = db.collection("transactions").doc();
    const repostRef = db.collection("reposts").doc();

    const batch = db.batch();

    console.log("📝 1. Adding to /reposts...");
    batch.set(repostRef, {
      userId,
      campaignId,
      trackUrl: campaignData.trackUrl,
      liked,
      comment,
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

