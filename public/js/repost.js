import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  increment
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

const container = document.getElementById("repost-container");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    container.innerHTML = `<p>Please log in to see repost campaigns.</p>`;
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDocs(collection(db, "users"));
    const userData = userSnap.docs.find(doc => doc.id === user.uid)?.data();
    const followers = userData?.followers || 1000; // Default if not set

    const campaignsSnap = await getDocs(collection(db, "campaigns"));
    const available = campaignsSnap.docs.filter(doc => doc.data().userId !== user.uid);

    if (available.length === 0) {
      container.innerHTML = `<p>No campaigns available to repost.</p>`;
      return;
    }

    container.innerHTML = "";

    available.forEach(docSnap => {
      const campaign = docSnap.data();
      const id = docSnap.id;
      const creditsEarned = Math.floor(followers / 100);

      const card = document.createElement("div");
      card.className = "campaign-card";
      card.innerHTML = `
        <h3>${campaign.genre}</h3>
        <p><a href="${campaign.trackUrl}" target="_blank">🔗 SoundCloud Track</a></p>
        <p>💸 Earn ${creditsEarned} credits for reposting</p>
        <label>
          <input type="checkbox" class="like-toggle" checked />
          ❤️ Like this track for 1 extra credit
        </label>
        <button class="repost-btn" data-id="${id}" data-user="${campaign.userId}" data-earn="${creditsEarned}">Repost & Earn</button>
        <div class="status-msg" id="status-${id}"></div>
      `;

      container.appendChild(card);
    });

    container.addEventListener("click", async (e) => {
      if (e.target.classList.contains("repost-btn")) {
        const btn = e.target;
        const campaignId = btn.dataset.id;
        const ownerId = btn.dataset.user;
        const creditsToEarn = parseInt(btn.dataset.earn);
        const likeChecked = btn.parentElement.querySelector(".like-toggle").checked;

        const totalEarned = likeChecked ? creditsToEarn + 1 : creditsToEarn;
        const status = document.getElementById(`status-${campaignId}`);

        try {
          // 👤 Reward current user
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            credits: increment(totalEarned)
          });

          // 💸 Deduct from campaign owner
          await updateDoc(doc(db, "users", ownerId), {
            credits: increment(-totalEarned)
          });

          status.textContent = `✅ Earned ${totalEarned} credits!`;
        } catch (err) {
          console.error("Error crediting repost:", err);
          status.textContent = "❌ Something went wrong.";
        }
      }
    });

  } catch (err) {
    console.error("Failed to load repost campaigns:", err);
    container.innerHTML = `<p>Error loading repost campaigns.</p>`;
  }
});
