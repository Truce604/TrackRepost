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
  query,
  where,
  getDocs,
  serverTimestamp
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
    status.textContent = "Checking repost limits...";

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

      // Get user data
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const followers = userData.followers || 0;
      const baseReward = Math.floor(followers / 100);

      const like = document.getElementById("like").checked;
      const follow = document.getElementById("follow").checked;
      const comment = document.getElementById("comment").checked;
      const commentText = document.getElementById("commentText").value;

      let totalReward = baseReward;
      if (like) totalReward += 1;
      if (follow) totalReward += 2;
      if (comment) totalReward += 2;

      if (data.credits < totalReward) {
        status.textContent = `❌ Not enough campaign credits to pay you (${totalReward} needed).`;
        return;
      }

      // Enforce repost limit (10 every 12 hours)
      const now = new Date();
      const resetHour = now.getHours() < 12 ? 0 : 12;
      const windowStart = new Date(now);
      windowStart.setHours(resetHour, 0, 0, 0);

      const repostsQuery = query(
        collection(db, "reposts"),
        where("userId", "==", user.uid),
        where("timestamp", ">", windowStart)
      );

      const repostsSnap = await getDocs(repostsQuery);
      const regularReposts = repostsSnap.docs.filter(doc => !doc.data().prompted);
      if (regularReposts.length >= 10) {
        status.textContent = "⏳ You've hit your repost limit for now. Try again later.";
        return;
      }

      // Save repost record
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
        credits: (userData.credits || 0) + totalReward
      });

      await updateDoc(doc(db, "campaigns", campaignId), {
        credits: data.credits - totalReward
      });

      await setDoc(doc(collection(db, "transactions")), {
        userId: user.uid,
        type: "earned",
        amount: totalReward,
        reason: `Reposted ${data.trackUrl}`,
        timestamp: serverTimestamp()
      });

      status.textContent = `✅ Repost complete! You earned ${totalReward} credits.`;
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
    buildRepostUI(data);
  } catch (err) {
    console.error("Error loading campaign:", err);
    container.innerHTML = "<p>❌ Failed to load campaign.</p>";
  }
};

loadCampaign();
