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
  doc,
  updateDoc,
  increment,
  setDoc
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
const statusBox = document.getElementById("status");

const renderCampaign = (campaign, id) => {
  const div = document.createElement("div");
  div.className = "rounded-lg p-4 bg-white shadow";
  div.innerHTML = `
    <h2 class="text-xl font-semibold mb-2">${campaign.genre}</h2>
    <p><a href="${campaign.trackUrl}" target="_blank" class="text-blue-500 underline">Listen on SoundCloud</a></p>
    <p class="my-1">Earn credits by reposting!</p>
    <button data-id="${id}" class="repost-btn px-4 py-2 bg-green-600 text-white rounded">Repost</button>
  `;
  container.appendChild(div);
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    statusBox.textContent = "Please log in to view campaigns.";
    return;
  }

  const campaignsRef = collection(db, "campaigns");
  const q = query(campaignsRef, where("userId", "!=", user.uid));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    statusBox.textContent = "No campaigns available right now.";
    return;
  }

  statusBox.textContent = "";
  snapshot.forEach(docSnap => {
    renderCampaign(docSnap.data(), docSnap.id);
  });

  container.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("repost-btn")) return;

    const campaignId = e.target.dataset.id;
    const userRef = doc(db, "users", user.uid);

    try {
      await updateDoc(userRef, {
        credits: increment(1)
      });

      await setDoc(doc(db, "reposts", `${user.uid}_${campaignId}`), {
        userId: user.uid,
        campaignId,
        timestamp: new Date().toISOString(),
      });

      e.target.disabled = true;
      e.target.textContent = "Reposted! +1 Credit";
    } catch (err) {
      console.error("Repost failed", err);
    }
  });
});
