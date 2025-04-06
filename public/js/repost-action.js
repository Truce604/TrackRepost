import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const container = document.getElementById("repost-container");
const urlParams = new URLSearchParams(window.location.search);
const campaignId = urlParams.get("id");

if (!campaignId) {
  container.innerHTML = "<p>❌ Missing campaign ID.</p>";
  throw new Error("Missing campaign ID");
}

let playerReady = false;
let trackPlayed = false;
let campaignData = null;

const buildRepostUI = (data) => {
  campaignData = data;

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
      src="https://w.soundcloud.com/player/?url=${encodeURIComponent(
        data.trackUrl
      )}&color=%23ff5500"
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

    <!-- Modal -->
    <div id="repost-modal" class="modal hidden">
      <div class="modal-content">
        <h3>Manual Repost Required</h3>
        <p>Please repost this track manually on SoundCloud before confirming.</p>
        <a href="${data.trackUrl}" target="_blank" class="repost-link">🔗 Repost on SoundCloud</a>
        <button id="confirm-manual-repost">I Reposted It ✅</button>
      </div>
    </div>
  `;

  injectModalStyles();
  setupPlayerListener();
  setupRepostForm();
};

const injectModalStyles = () => {
  const style = document.createElement("style");
  style.innerHTML = `
    .modal.hidden { display: none; }
    .modal {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }
    .modal-content {
      background: #1e1e1e;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      color: white;
      max-width: 300px;
    }
    .repost-link {
      display: block;
      margin: 10px 0;
      color: #ffa500;
      font-weight: bold;
      text-decoration: underline;
    }
    #confirm-manual-repost {
      background: #ffa500;
      color: black;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
    }
    .success-box {
      margin-top: 20px;
      background: #222;
      border: 1px solid #4caf50;
      padding: 15px;
      border-radius: 8px;
      color: #4caf50;
      font-weight: bold;
      animation: fadeIn 0.5s ease-in-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
};

const setupPlayerListener = () => {
  const player = document.getElementById("sc-player");
  let playTime = 0;
  let interval = null;

  window.addEventListener("message", (event) => {
    const widgetOrigin = "https://w.soundcloud.com";
    if (event.origin !== widgetOrigin) return;

    const widget = player.contentWindow;

    if (event.data === "ready") {
      widget.postMessage({ method: "addEventListener", value: "play" }, widgetOrigin);
      playerReady = true;
    }

    if (event.data === "play" && !trackPlayed) {
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
};

const setupRepostForm = () => {
  const form = document.getElementById("repost-form");
  const status = document.getElementById("status");
  const modal = document.getElementById("repost-modal");
  const confirmBtn = document.getElementById("confirm-manual-repost");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    modal.classList.remove("hidden");
  });

  confirmBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    processRepost(status);
  });
};

const processRepost = async (status) => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return (status.textContent = "❌ You must be logged in.");

    const repostRef = doc(db, "reposts", `${user.uid}_${campaignId}`);
    const repostSnap = await getDoc(repostRef);
    if (repostSnap.exists()) {
      status.textContent = "⚠️ Already reposted.";
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};
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

    const repostQuery = query(
      collection(db, "reposts"),
      where("userId", "==", user.uid),
      where("timestamp", ">", windowStart)
    );
    const repostSnapLimit = await getDocs(repostQuery);
    const count = repostSnapLimit.docs.filter(doc => !doc.data().prompted).length;

    if (count >= 10) {
      status.textContent = "⏳ Repost limit hit. Try again later.";
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

    if (campaignData.credits < totalReward) {
      status.textContent = `❌ Not enough campaign credits (needs ${totalReward}).`;
      return;
    }

    await setDoc(repostRef, {
      userId: user.uid,
      campaignId,
      trackUrl: campaignData.trackUrl,
      timestamp: serverTimestamp(),
      prompted: false,
      like,
      follow,
      comment,
      commentText
    });

    await updateDoc(userRef, {
      credits: (userData.credits || 0) + totalReward
    });

    const campaignRef = doc(db, "campaigns", campaignId);
    await updateDoc(campaignRef, {
      credits: campaignData.credits - totalReward
    });

    await addDoc(collection(db, "transactions"), {
      userId: user.uid,
      type: "earned",
      amount: totalReward,
      reason: `Reposted ${campaignData.title}`,
      timestamp: serverTimestamp()
    });

    const allReposts = await getDocs(query(collection(db, "reposts"), where("userId", "==", user.uid)));
    const total = allReposts.docs.length;

    container.innerHTML = `
      <div class="success-box">
        ✅ Repost Complete! You earned ${totalReward} credits.
        <br/>📊 You’ve reposted ${total} tracks so far.
      </div>
    `;

    setTimeout(() => {
      window.location.href = "explore.html";
    }, 3000);
  });
};

const loadCampaign = async () => {
  const campaignRef = doc(db, "campaigns", campaignId);
  const campaignSnap = await getDoc(campaignRef);
  if (!campaignSnap.exists()) {
    container.innerHTML = "<p>❌ Campaign not found.</p>";
    return;
  }

  const data = campaignSnap.data();
  buildRepostUI(data);
};

loadCampaign();



