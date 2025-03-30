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
  getDocs,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { firebaseConfig } from "../firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const userInfo = document.getElementById("userInfo");
const creditBalance = document.getElementById("creditBalance");
const campaignContainer = document.getElementById("campaigns");
const logoutButton = document.getElementById("logoutButton");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    userInfo.innerHTML = `<p>Please log in to view your dashboard.</p>`;
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      userInfo.innerHTML = `<p>User data not found.</p>`;
      return;
    }

    const userData = userSnap.data();
    const credits = userData.credits || 0;
    const displayName = userData.displayName || user.email;

    userInfo.innerHTML = `
      <p><strong>${displayName}</strong></p>
      <p>Email: ${user.email}</p>
    `;

    creditBalance.textContent = `${credits} credits`;

    // Load user's campaigns
    const q = query(
      collection(db, "campaigns"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const campaignSnap = await getDocs(q);

    if (campaignSnap.empty) {
      campaignContainer.innerHTML = `<p>You haven't submitted any campaigns yet.</p>`;
      return;
    }

    campaignContainer.innerHTML = "";
    campaignSnap.forEach(doc => {
      const data = doc.data();
      const div = document.createElement("div");
      div.className = "campaign-card";
      div.innerHTML = `
        <h3>${data.genre}</h3>
        <p><a href="${data.trackUrl}" target="_blank">🎵 View Track</a></p>
        <p>Credits Remaining: ${data.credits}</p>
        <p class="timestamp">Submitted: ${new Date(data.createdAt).toLocaleString()}</p>
      `;
      campaignContainer.appendChild(div);
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    userInfo.innerHTML = `<p>⚠️ Failed to load dashboard data.</p>`;
  }
});

// Logout button
logoutButton.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

