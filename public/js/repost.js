// public/js/repost.js
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
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw", 
  authDomain: "trackrepost-921f8.firebaseapp.com", 
  projectId: "trackrepost-921f8", 
  storageBucket: "trackrepost-921f8.appspot.com", 
  messagingSenderId: "967836604288", 
  appId: "1:967836604288:web:3782d50de7384c9201d365", 
  measurementId: "G-G65Q3HC3R8" 
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const repostButtons = document.querySelectorAll(".repost-button");

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  repostButtons.forEach(button => {
    button.addEventListener("click", async () => {
      const campaignId = button.dataset.campaignId;
      const followerCount = parseInt(prompt("Enter your follower count (must be real):"));
      if (isNaN(followerCount) || followerCount <= 0) return alert("Invalid follower count");

      const earnedCredits = Math.floor(followerCount / 100);
      if (earnedCredits <= 0) return alert("You need at least 100 followers to earn credits.");

      const campaignRef = doc(db, "campaigns", campaignId);
      const campaignSnap = await getDoc(campaignRef);
      if (!campaignSnap.exists()) return alert("Campaign not found");

      const campaignData = campaignSnap.data();
      const campaignOwnerId = campaignData.userId;

      // Prevent duplicate reposts
      const repostsRef = collection(db, "reposts");
      const q = query(repostsRef, where("userId", "==", user.uid), where("campaignId", "==", campaignId));
      const repostSnap = await getDocs(q);
      if (!repostSnap.empty) return alert("You already reposted this track.");

      if (campaignData.credits < earnedCredits) return alert("Not enough credits left in campaign.");

      // Log repost
      await setDoc(doc(repostsRef), {
        userId: user.uid,
        campaignId,
        earnedCredits,
        createdAt: serverTimestamp()
      });

      // Credit transfer
      await updateDoc(doc(db, "users", campaignOwnerId), {
        credits: increment(-earnedCredits)
      });

      await updateDoc(doc(db, "users", user.uid), {
        credits: increment(earnedCredits)
      });

      alert(`✅ Reposted successfully. You earned ${earnedCredits} credits!`);
      button.disabled = true;
      button.textContent = "Already Reposted";
    });
  });
});
