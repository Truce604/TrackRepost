const db = firebase.firestore();
const auth = firebase.auth();

const container = document.getElementById("repost-container");
const urlParams = new URLSearchParams(window.location.search);
const campaignId = urlParams.get("id");

if (!campaignId) {
  container.innerHTML = "<p>❌ Missing campaign ID.</p>";
  throw new Error("Missing campaign ID");
}

let trackPlayed = false;
let campaignData = null;

async function loadCampaign() {
  try {
    const docRef = db.collection("campaigns").doc(campaignId);
    const snap = await docRef.get();
    if (!snap.exists) {
      container.innerHTML = "<p>❌ Campaign not found.</p>";
      return;
    }

    campaignData = snap.data();
    renderCampaign(campaignData);
  } catch (err) {
    console.error("⚠️ Error loading campaign:", err);
    container.innerHTML = "<p>❌ Failed to load campaign.</p>";
  }
}

function renderCampaign(data) {
  container.innerHTML = `
    <div class="track-meta">
      <img src="${data.artworkUrl}" class="artwork" alt="Artwork" />
      <div class="meta-info">
        <h2>${data.title}</h2>
        <p>${data.artist}</p>
        <p>🎯 ${data.genre}</p>
      </div>
    </div>
    <iframe
      id="sc-player"
      src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.trackUrl)}&color=%23ff5500"
      frameborder="no"
      scrolling="no"
      allow="autoplay"
      width="100%"
      height="120"
    ></iframe>
    <p id="play-status">▶️ Play the track to unlock repost</p>
    <form id="repost-form" class="repost-form">
      <label><input type="checkbox" id="like" checked /> 💖 Like this track (+1 credit)</label>
      <label><input type="checkbox" id="follow" checked /> 👣 Follow the artist (+2 credits)</label>
      <label><input type="checkbox" id="comment" /> 💬 Leave a comment (+2 credits)</label>
      <textarea id="commentText" placeholder="Write a comment..."></textarea>
      <button type="submit" id="repost-button" disabled>✅ Repost & Earn</button>
    </form>
    <div class="status-message" id="status"></div>

    <div id="repost-modal" class="modal hidden">
      <div class="modal-content">
        <h3>Manual Repost Required</h3>
        <p>Please repost this track manually on SoundCloud before confirming.</p>
        <a href="${data.trackUrl}" target="_blank" class="repost-link">🔗 Repost on SoundCloud</a>
        <button id="confirm-manual-repost">I Reposted It ✅</button>
      </div>
    </div>
  `;

  setupPlayer();
  setupModal();
}

function setupPlayer() {
  const iframe = document.getElementById("sc-player");
  const widget = window.SC.Widget(iframe);
  let playTime = 0;
  let interval = null;

  widget.bind(window.SC.Widget.Events.READY, () => {
    widget.bind(window.SC.Widget.Events.PLAY, () => {
      if (!trackPlayed) {
        playTime = 0;
        interval = setInterval(() => {
          playTime++;
          if (playTime >= 3) {
            clearInterval(interval);
            trackPlayed = true;
            document.getElementById("repost-button").disabled = false;
            document.getElementById("play-status").textContent =
              "✅ Track played. Repost unlocked!";
          }
        }, 1000);
      }
    });
  });
}

function setupModal() {
  const form = document.getElementById("repost-form");
  const modal = document.getElementById("repost-modal");
  const confirmBtn = document.getElementById("confirm-manual-repost");
  const status = document.getElementById("status");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    modal.classList.remove("hidden");
  });

  confirmBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    handleRepost(status);
  });
}

function handleRepost(status) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) return (status.textContent = "❌ You must be logged in.");

    const userId = user.uid;
    const repostRef = db.collection("reposts").doc(`${userId}_${campaignId}`);
    const userRef = db.collection("users").doc(userId);
    const campaignRef = db.collection("campaigns").doc(campaignId);
    const transactionRef = db.collection("transactions").doc();

    try {
      const repostSnap = await repostRef.get();
      if (repostSnap.exists) {
        status.textContent = "⚠️ Already reposted.";
        return;
      }

      const userSnap = await userRef.get();
      const userData = userSnap.data();
      const followers = userData.soundcloud?.followers || 0;
      const baseReward = Math.floor(followers / 100);
      if (baseReward <= 0) {
        status.textContent = "❌ Need 100+ followers to earn.";
        return;
      }

      const now = new Date();
      const resetHour = now.getHours() < 12 ? 0 : 12;
      const windowStart = new Date(now);
      windowStart.setHours(resetHour, 0, 0, 0);

      const repostsQuery = await db.collection("reposts")
        .where("userId", "==", userId)
        .where("timestamp", ">", windowStart)
        .get();

      const limitReached = repostsQuery.docs.filter(doc => !doc.data().prompted).length >= 10;
      if (limitReached) {
        status.textContent = "🚫 Repost limit hit. Try again after reset.";
        return;
      }

      const like = document.getElementById("like").checked;
      const follow = document.getElementById("follow").checked;
      const comment = document.getElementById("comment").checked;
      const commentText = document.getElementById("commentText").value;

      let reward = baseReward;
      if (like) reward += 1;
      if (follow) reward += 2;
      if (comment && commentText.trim()) reward += 2;

      if (campaignData.credits < reward) {
        status.textContent = "❌ Not enough campaign credits.";
        return;
      }

      // ✅ START BATCH
      console.log("🔥 Starting Firestore batch...");
      const batch = db.batch();

      batch.set(repostRef, {
        userId,
        campaignId,
        trackUrl: campaignData.trackUrl,
        timestamp: new Date(),
        prompted: false,
        like,
        follow,
        comment,
        commentText
      });

      batch.update(userRef, {
        credits: (userData.credits || 0) + reward
      });

      batch.update(campaignRef, {
        credits: campaignData.credits - reward
      });

      batch.set(transactionRef, {
        userId,
        type: "earned",
        amount: reward,
        reason: `Reposted ${campaignData.title}`,
        timestamp: new Date()
      });

      await batch.commit();
      console.log("✅ Repost + credits + log committed");

      const allReposts = await db.collection("reposts")
        .where("userId", "==", userId).get();

      container.innerHTML = `
        <div class="success-box">
          ✅ Repost Complete! You earned ${reward} credits.
          <br/>📊 You’ve reposted ${allReposts.size} tracks so far.
        </div>
      `;

      setTimeout(() => {
        window.location.href = "explore.html";
      }, 3000);
    } catch (err) {
      console.error("🔥 Repost failed:", err);
      status.textContent = "❌ Firestore error: check rules or logs.";
    }
  });
}

loadCampaign();

