import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase config
import firebaseConfig from "./firebaseConfig.js"; // Adjust if needed

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Repost logic
export async function handleRepost(campaignId, trackUrl, prompted = false) {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        return reject("You must be logged in to repost.");
      }

      const userId = user.uid;
      const now = Timestamp.now();
      const twelveHoursAgo = Timestamp.fromMillis(now.toMillis() - 12 * 60 * 60 * 1000);

      const repostsRef = collection(db, "reposts");
      const recentQuery = query(
        repostsRef,
        where("userId", "==", userId),
        where("timestamp", ">", twelveHoursAgo)
      );

      const recentRepostsSnap = await getDocs(recentQuery);
      const repostedTrack = recentRepostsSnap.docs.find(doc => doc.data().trackUrl === trackUrl);

      if (repostedTrack) {
        return reject("You’ve already reposted this track.");
      }

      const numReposts = recentRepostsSnap.docs.length;
      const isAllowed = prompted || numReposts < 10;

      if (!isAllowed) {
        return reject("You’ve reached your repost limit (10 in 12 hours).");
      }

      await addDoc(repostsRef, {
        userId,
        campaignId,
        trackUrl,
        timestamp: serverTimestamp(),
        prompted,
      });

      resolve("✅ Repost recorded successfully.");
    });
  });
}
