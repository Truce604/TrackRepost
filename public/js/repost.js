// public/js/repost.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
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

const container = document.getElementById("repost-container");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    container.innerHTML = `<p>You must be logged in to view repost campaigns.</p>`;
    return;
  }

  try {
    const repostsSnapshot = await getDocs(
      query(
        collection(db, "reposts"),
        where("userId", "==", user.uid)
      )
    );

    const recentReposts = repostsSnapshot.docs
      .map(doc => doc.data())
      .filter(post => {
        const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
        return new Date(post.timestamp).getTime() > twelveHoursAgo;
      });

    const campaignSnapshot = await getDocs(collection(db, "campaigns"));
    const alreadyRepostedUrls = repostsSnapshot.docs.map(doc => doc.data().trackUrl);
    const campaigns = [];

    campaignSnapshot.forEach(doc => {
      const campaign = doc.data();
      if (
        campaign.userId !== user.uid &&
        !alreadyRepostedUrls.includes(campaign.trackUrl)
      ) {
        campaigns.push({ id: doc.id, ...campaign });
      }
    });

    if (campaigns.length === 0) {
      container.innerHTML = `<p>No campaigns available right now. Check back soon!</p>`;
      return;
    }

    container.innerHTML = "";
    campaigns.forEach((c) => {
      const el = document.createElement("div");
      el.className = "campaign-card";
      el.innerHTML = `
        <h3>${c.genre}</h3>
        <p><a href="${c.trackUrl}" target="_blank">🎧 Listen & Repost</a></p>
        <label><input type="checkbox" checked class="like-checkbox"> ❤️ Like for +1 Credit</label>
        <label><input type="checkbox" class="comment-checkbox"> 💬 Comment for +2 Credits</label>
        <button data-track="${c.trackUrl}" data-owner="${c.userId}" data-campaign="${c.id}">
          Repost This Track
        </button>
      `;
      container.appendChild(el);
    });

    container.addEventListener("click", async (e) => {
      if (e.target.tagName === "BUTTON") {
        const btn = e.target;
        const trackUrl = btn.dataset.track;
        const campaignId = btn.dataset.campaign;
        const campaignOwner = btn.dataset.owner;

        const likeChecked = btn.parentElement.querySelector(".like-checkbox").checked;
        const commentChecked = btn.parentElement.querySelector(".comment-checkbox").checked;

        const userRef = doc(db, "users", user.uid);
        const ownerRef = doc(db, "users", campaignOwner);

        const bonus = (likeChecked ? 1 : 0) + (commentChecked ? 2 : 0);
        const userSnap = await getDocs(query(collection(db, "users"), where("uid", "==", user.uid)));
        const followers = userSnap.empty ? 0 : (userSnap.docs[0].data().followers || 0);
        const earned = Math.floor(followers / 100) + bonus;

        await setDoc(doc(db, "reposts", `${user.uid}_${campaignId}`), {
          userId: user.uid,
          campaignId,
          trackUrl,
          prompted: false,
          timestamp: new Date().toISOString()
        });

        await setDoc(userRef, {
          credits: earned
        }, { merge: true });

        await setDoc(ownerRef, {
          credits: -Math.floor(followers / 100)
        }, { merge: true });

        alert(`✅ Reposted! You earned ${earned} credits.`);
        btn.disabled = true;
        btn.textContent = "Reposted ✅";
      }
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p>Error loading repost campaigns.</p>`;
  }
});

