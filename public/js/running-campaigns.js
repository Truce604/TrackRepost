import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { firebaseConfig } from "./firebaseConfig.js"; // if this throws an error, use inline config

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const campaignDetails = document.getElementById("campaign-details");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    campaignDetails.innerHTML = `<p>Please <a href="login.html">log in</a> to view your campaign.</p>`;
    return;
  }

  const q = query(
    collection(db, "campaigns"),
    where("userId", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    campaignDetails.innerHTML = `<p>You haven't submitted a campaign yet.</p>`;
    return;
  }

  const campaign = snapshot.docs[0].data();
  const createdDate = new Date(campaign.createdAt).toLocaleString();

  campaignDetails.innerHTML = `
    <div class="campaign-card">
      <h3>${campaign.genre}</h3>
      <p><strong>Track:</strong> <a href="${campaign.trackUrl}" target="_blank">${campaign.trackUrl}</a></p>
      <p><strong>Credits Remaining:</strong> ${campaign.credits}</p>
      <p><strong>Created At:</strong> ${createdDate}</p>
    </div>
  `;
});
