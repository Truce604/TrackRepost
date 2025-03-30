// public/js/dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from "../firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const creditDisplay = document.getElementById("creditBalance");
const campaignContainer = document.getElementById("campaigns");
const userInfo = document.getElementById("userInfo");
const planBadge = document.getElementById("planBadge");
const logoutBtn = document.getElementById("logoutButton");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    userInfo.textContent = "Please log in to view your dashboard.";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};
  const credits = userData.credits || 0;
  const isPro = userData.isPro || false;

  userInfo.textContent = `Welcome, ${user.displayName || "User"}!`;
  creditDisplay.textContent = `${credits} credits`;

  // 💎 Show plan badge
  planBadge.innerHTML = isPro
    ? `<span class="badge pro">PRO PLAN</span>`
    : `<span class="badge free">FREE PLAN</span>`;

  // 📣 Load campaigns
  const q = query(
    collection(db, "campaigns"),
    where("userId", "==", user.uid)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    campaignContainer.innerHTML = `<p>No active campaigns yet.</p>`;
  } else {
    campaignContainer.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement("div");
      div.className = "campaign-card";
      div.innerHTML = `
        <h3>${data.genre}</h3>
        <p><a href="${data.trackUrl}" target="_blank">Listen on SoundCloud</a></p>
        <p>Credits Remaining: ${data.credits}</p>
      `;
      campaignContainer.appendChild(div);
    });
  }
});

// 🔓 Logout
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
});


