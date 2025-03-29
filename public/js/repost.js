
// public/js/repost.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ✅ Firebase Config
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ DOM Elements
const campaignFeed = document.getElementById("campaign-feed");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    campaignFeed.innerHTML = "<p>Please log in to see and repost campaigns.</p>";
    return;
  }

  const userId = user.uid;

  // ✅ Get user's last 12 hours of reposts
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const repostsQuery = query(
    collection(db, "reposts"),
    where("userId", "==", userId)
  );
  const repostsSnapshot = await getDocs(repostsQuery);

  const recentReposts = [];
  repostsSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.timestamp?.toDate() > twelveHoursAgo) {
      recentReposts.push(data);
    }
  });

  const repostedTrackUrls = new Set(recentReposts.map(r => r.trackUrl));
  const recentRepostCount = recentReposts.filter(r => !r.prompted).length;

  // ✅ Load campaigns
  const campaignsSnapshot = await getDocs(collection(db, "campaigns"));
  campaignsSnapshot.forEach(doc => {
    const campaign = doc.data();

    // Skip if already reposted
    if (repostedTrackUrls.has(campaign.trackUrl)) return;

    const card = document.createElement("div");
    card.className = "campaign-card";
    card.innerHTML = \`
      <h3>\${campaign.genre}</h3>
      <p><a href="\${campaign.trackUrl}" target="_blank">Listen on SoundCloud</a></p>
      <button class="repost-btn">🔁 Repost & Earn</button>
    \`;

    const btn = card.querySelector(".repost-btn");
    btn.addEventListener("click", async () => {
      if (recentRepostCount >= 10) {
        alert("You've reached your 10 reposts for the last 12 hours.");
        return;
      }

      try {
        await addDoc(collection(db, "reposts"), {
          userId,
          campaignId: doc.id,
          trackUrl: campaign.trackUrl,
          timestamp: serverTimestamp(),
          prompted: false
        });
        alert("✅ Reposted! You earned credits.");
        location.reload();
      } catch (err) {
        console.error("Repost failed:", err);
        alert("❌ Failed to repost.");
      }
    });

    campaignFeed.appendChild(card);
  });
});
