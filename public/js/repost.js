// public/js/repost.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  increment,
  addDoc,
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

const campaignsContainer = document.getElementById("campaigns");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    campaignsContainer.innerHTML = "<p>Please log in to repost and earn credits.</p>";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const followerCount = userSnap.exists() ? userSnap.data().followers || 0 : 0;
  const earnedPerRepost = Math.floor(followerCount / 100);

  const campaignsSnap = await getDocs(collection(db, "campaigns"));

  campaignsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.userId === user.uid || data.credits < earnedPerRepost) return; // Don't show user's own or unfunded

    const card = document.createElement("div");
    card.className = "campaign-card";
    card.innerHTML = `
      <h3>${data.genre}</h3>
      <p><a href="${data.trackUrl}" target="_blank">🔗 Listen on SoundCloud</a></p>
      <label>
        <input type="checkbox" class="like-checkbox" checked>
        ❤️ Like this track (1 credit)
      </label>
      <textarea class="comment-box" placeholder="Leave a comment (2 credits)"></textarea>
      <button class="repost-btn">🔁 Repost & Earn ${earnedPerRepost}+ credits</button>
    `;

    card.querySelector(".repost-btn").addEventListener("click", async () => {
      const likeChecked = card.querySelector(".like-checkbox").checked;
      const commentText = card.querySelector(".comment-box").value.trim();
      const extra = (likeChecked ? 1 : 0) + (commentText ? 2 : 0);
      const totalCreditsEarned = earnedPerRepost + extra;

      try {
        await updateDoc(doc(db, "users", user.uid), {
          credits: increment(totalCreditsEarned),
        });

        await updateDoc(doc(db, "campaigns", docSnap.id), {
          credits: increment(-totalCreditsEarned),
        });

        await addDoc(collection(db, "reposts"), {
          userId: user.uid,
          campaignId: docSnap.id,
          liked: likeChecked,
          comment: commentText || null,
          earned: totalCreditsEarned,
          createdAt: serverTimestamp(),
        });

        card.querySelector(".repost-btn").disabled = true;
        card.querySelector(".repost-btn").textContent = `✅ Reposted for ${totalCreditsEarned} credits!`;
      } catch (err) {
        console.error("Repost error:", err);
        alert("❌ Something went wrong. Try again.");
      }
    });

    campaignsContainer.appendChild(card);
  });
});
