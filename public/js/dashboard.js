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
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { firebaseConfig } from "../firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const creditDisplay = document.getElementById("creditBalance");
const userInfo = document.getElementById("userInfo");
const logoutButton = document.getElementById("logoutButton");
const campaignContainer = document.getElementById("campaigns");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    userInfo.textContent = "Please log in.";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    creditDisplay.textContent = `${data.credits || 0} credits`;
    userInfo.innerHTML = `Welcome, ${data.displayName || "user"}<br>
      <small>${user.email}</small>`;
  }

  // Load user's campaigns
  const q = query(
    collection(db, "campaigns"),
    where("userId", "==", user.uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    campaignContainer.innerHTML = "<p>You haven't submitted any campaigns yet.</p>";
  } else {
    campaignContainer.innerHTML = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const card = document.createElement("div");
      card.className = "campaign-card";
      card.innerHTML = `
        <h3>${d.genre}</h3>
        <p><a href="${d.trackUrl}" target="_blank">SoundCloud Track</a></p>
        <p>Credits Remaining: ${d.credits}</p>
        <p>Created: ${new Date(d.createdAt).toLocaleString()}</p>
      `;
      campaignContainer.appendChild(card);
    });
  }

  // Load transaction history
  const txRef = query(
    collection(db, "transactions"),
    where("userId", "==", user.uid),
    orderBy("timestamp", "desc")
  );
  const txSnap = await getDocs(txRef);

  const txSection = document.createElement("div");
  txSection.innerHTML = `<h2>💳 Credit History</h2><table><thead><tr><th>Type</th><th>Amount</th><th>Reason</th><th>Date</th></tr></thead><tbody id="txBody"></tbody></table>`;
  campaignContainer.parentElement.appendChild(txSection);

  const txBody = txSection.querySelector("#txBody");

  txSnap.forEach(doc => {
    const tx = doc.data();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${tx.type}</td>
      <td>${tx.amount}</td>
      <td>${tx.reason}</td>
      <td>${new Date(tx.timestamp.toDate()).toLocaleString()}</td>
    `;
    txBody.appendChild(row);
  });
});

// Logout
logoutButton.addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
});

