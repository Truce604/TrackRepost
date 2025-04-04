// /js/repost-action.js
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

const buildRepostUI = (data) => {
  container.innerHTML = `
    <div class="track-meta">
      <img src="${data.artworkUrl}" class="artwork" alt="Artwork" />
      <div class="meta-info">
        <h2>${data.title}</h2>
        <p>${data.artist}</p>
        <p>🎯 ${data.genre}</p>
      </div>
    </div>
    <iframe src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.trackUrl)}&color=%23ff5500" frameborder="no" scrolling="no"></iframe>
    <form id="repost-form" class="repost-form">
      <label><input type="checkbox" id="like" checked /> 💖 Like this track (+1 credit)</label>
      <label><input type="checkbox" id="follow" checked /> 👣 Follow the artist (+2 credits)</label>
      <label><input type="checkbox" id="comment" /> 💬 Leave a comment (+2 credits)</label>
      <textarea id="commentText" placeholder="Write a comment..."></textarea>
      <button type="submit">✅ Repost & Earn</button>
    </form>
    <div class="status-message" id="status"></div>
  `;

  const form = document.getElementById("repost-form");
  const status = document.getElementById("status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "⏳ Checking...";

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
      const repostSnap = await getDocs(repostQuery);
      const count = repostSnap.docs.filter(doc => !doc.data().prompted).length;

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

      if (data.credits < totalReward) {
        status.textContent = `❌ Not enough campaign credits (needs ${totalReward}).`;
        return;
      }

      await setDoc(repostRef, {
        userId: user.uid,
        campaignId,
        trackUrl: data.trackUrl,
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
        credits: data.credits - totalReward
      });

      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        type: "earned",
        amount: totalReward,
        reason: `Reposted ${data.title}`,
        timestamp: serverTimestamp()
      });

      status.textContent = `✅ Reposted! You earned ${totalReward} credits.`;
      form.reset();
    });
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



