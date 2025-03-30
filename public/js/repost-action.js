import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { firebaseConfig } from "../firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const container = document.getElementById("repost-action-container");
const urlParams = new URLSearchParams(window.location.search);
const campaignId = urlParams.get("id");

if (!campaignId) {
  container.innerHTML = "<p>❌ Missing campaign ID.</p>";
  throw new Error("Missing campaign ID");
}

const buildRepostUI = (data, campaignId) => {
  container.innerHTML = `
    <h2>${data.genre} – Earn Credits!</h2>
    <iframe width="100%" height="166" scrolling="no" frameborder="no"
      src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.trackUrl)}&color=%23ff5500&inverse=false&auto_play=false&show_user=true">
    </iframe>

    <form id="repost-options" class="campaign-form">
      <label><input type="checkbox" id="like" checked /> 💖 Like this track (+1 credit)</label><br>
      <label><input type="checkbox" id="follow" checked /> 👣 Follow the artist (+2 credits)</label><br>
      <label><input type="checkbox" id="comment" /> 💬 Leave a comment (+2 credits)</label><br>
      <input type="text" id="commentText" placeholder="Enter your comment here..." style="margin-top: 10px; width: 100%;" />
      <button type="submit">✅ Complete Repost & Earn</button>
    </form>

    <div id="status" class="status-message"></div>
  `;

  const form = document.getElementById("repost-options");
  const status = document.getElementById("status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Processing...";

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        status.textContent = "❌ You must be logged in.";
        return;
      }

      const repostRef = doc(db, "reposts", `${user.uid}_${campaignId}`);
      const repostSnap = await getDoc(repostRef);
      if (repostSnap.exists()) {
        status.textContent = "⚠️ You already reposted this track.";
        return;
      }

      // Enforce 10 reposts per 12-hour window unless prompted
      const now = new Date();
      const localHour = now.getHours();
      const resetHour = localHour >= 12 ? 12 : 0;
      const windowStart = new Date(now);
      windowStart.setHours(resetHour, 0, 0, 0);

      const repostsQuery = query(
        collection(db, "reposts"),
        where("userId", "==", user.uid),
        where("timestamp", ">=", windowStart)
      );
      const repostsSnap = await getDocs(repostsQuery);
      if (repostsSnap.size >= 10) {
        status.textContent = "⏳ You've hit your repost limit for this period. Come back later!";
        return;
      }

      const like = document.getElementById("like").checked;
      const follow = document.getElementById("follow").checked;
      const comment = document.getElementById("comment").checked;
      const commentText = document.getElementById("commentText").value;

      let earnedCredits = 0;
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const followerCount = userSnap.exists() ? userSnap.data().followers || 0 : 0;
      earnedCredits += Math.floor(followerCount / 100);

      if (like) earnedCredits += 1;
      if (follow) earnedCredits += 2;
      if (comment) earnedCredits += 2;

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

      await updateDoc(doc(db, "users", user.uid), {
        credits: (userSnap.data().credits || 0) + earnedCredits
      });

      await updateDoc(doc(db, "campaigns", campaignId), {
        credits: data.credits - earnedCredits
      });

      status.textContent = `✅ Repost complete! You earned ${earnedCredits} credits.`;
    });
  });
};

const loadCampaign = async () => {
  try {
    const docSnap = await getDoc(doc(db, "campaigns", campaignId));
    if (!docSnap.exists()) {
      container.innerHTML = "<p>❌ Campaign not found.</p>";
      return;
    }

    const data = docSnap.data();
    if (data.credits <= 0) {
      container.innerHTML = "<p>⚠️ This campaign has run out of credits.</p>";
      return;
    }

    buildRepostUI(data, campaignId);
  } catch (err) {
    console.error("Error loading campaign:", err);
    container.innerHTML = "<p>❌ Failed to load campaign.</p>";
  }
};

loadCampaign();
