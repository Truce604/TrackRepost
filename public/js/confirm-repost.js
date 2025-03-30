import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { firebaseConfig } from "../firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const params = new URLSearchParams(window.location.search);
const campaignId = params.get("campaignId");
const trackUrl = params.get("trackUrl");

const trackInfo = document.getElementById("track-info");
const form = document.getElementById("repost-options");
const likeTrack = document.getElementById("likeTrack");
const leaveComment = document.getElementById("leaveComment");
const status = document.getElementById("status");

if (!campaignId || !trackUrl) {
  trackInfo.innerHTML = "❌ Invalid or missing campaign data.";
  form.style.display = "none";
}

trackInfo.innerHTML = `<p>You're about to repost:</p><a href="${trackUrl}" target="_blank">${trackUrl}</a>`;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    status.textContent = "❌ You must be logged in.";
    return;
  }

  const userId = user.uid;

  // ⛔ Check if already reposted
  const repostsRef = collection(db, "reposts");
  const repostQuery = query(
    repostsRef,
    where("userId", "==", userId),
    where("campaignId", "==", campaignId)
  );
  const repostSnap = await getDocs(repostQuery);
  if (!repostSnap.empty) {
    status.textContent = "⚠️ You already reposted this track.";
    form.style.display = "none";
    return;
  }

  // ✅ Submit repost
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    form.style.display = "none";
    status.textContent = "Processing your repost...";

    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      const followers = userSnap.data()?.soundcloud?.followers || 0;
      const earnedBase = Math.floor(followers / 100); // 1 credit per 100 followers
      const earnedLike = likeTrack.checked ? 1 : 0;
      const earnedComment = leaveComment.checked ? 2 : 0;
      const totalEarned = earnedBase + earnedLike + earnedComment;

      const campaignRef = doc(db, "campaigns", campaignId);
      const campaignSnap = await getDoc(campaignRef);
      const currentCredits = campaignSnap.data()?.credits || 0;

      if (currentCredits < earnedBase) {
        status.textContent = "❌ Campaign owner has insufficient credits.";
        return;
      }

      // 👣 Log repost
      await addDoc(repostsRef, {
        userId,
        campaignId,
        trackUrl,
        like: likeTrack.checked,
        comment: leaveComment.checked,
        timestamp: serverTimestamp()
      });

      // 🔄 Credit updates
      await updateDoc(userRef, {
        credits: increment(totalEarned)
      });

      await updateDoc(campaignRef, {
        credits: increment(-earnedBase)
      });

      status.textContent = `✅ Repost successful! You earned ${totalEarned} credits.`;
    } catch (err) {
      console.error(err);
      status.textContent = "❌ Something went wrong.";
    }
  });
});
