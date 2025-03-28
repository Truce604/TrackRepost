// public/js/dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

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

// DOM Elements
const userInfo = document.getElementById("userInfo");
const creditBalance = document.getElementById("creditBalance");
const campaignContainer = document.getElementById("campaigns");
const logoutButton = document.getElementById("logoutButton");

// Auth State
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userInfo.textContent = `👋 Logged in as ${user.email}`;
    await loadCredits(user.uid);
    await loadCampaigns(user.uid);
  } else {
    userInfo.textContent = "🔐 Not logged in";
    creditBalance.textContent = "-";
    campaignContainer.innerHTML = "<p>Please log in to view your campaigns.</p>";
  }
});

// Load user credits
async function loadCredits(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    creditBalance.textContent = `${data.credits ?? 0} credits`;
  } else {
    creditBalance.textContent = "0 credits";
  }
}

// Load campaigns
async function loadCampaigns(uid) {
  const q = query(
    collection(db, "campaigns"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    campaignContainer.innerHTML = "<p>You haven't submitted any campaigns yet.</p>";
    return;
  }

  campaignContainer.innerHTML = ""; // Clear existing

  snapshot.forEach((docSnap) => {
    const campaign = docSnap.data();
    const card = document.createElement("div");
    card.className = "campaign-card";
    card.innerHTML = `
      <h3>${campaign.genre}</h3>
      <p><strong>Track:</strong> <a href="${campaign.trackUrl}" target="_blank">SoundCloud Link</a></p>
      <p><strong>Credits Left:</strong> ${campaign.credits}</p>
      <p><strong>Created:</strong> ${campaign.createdAt ? new Date(campaign.createdAt).toLocaleString() : "N/A"}</p>
    `;
    campaignContainer.appendChild(card);
  });
}

// Logout
if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "/index.html";
  });
}
