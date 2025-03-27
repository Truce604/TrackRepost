import { db, auth } from "./firebase-init.js";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

const campaignContainer = document.getElementById("campaigns");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    campaignContainer.innerHTML = `<p>Please log in to view your campaigns.</p>`;
    return;
  }

  const q = query(
    collection(db, "campaigns"),
    where("userId", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    campaignContainer.innerHTML = `<p>You haven't submitted any campaigns yet.</p>`;
    return;
  }

  snapshot.forEach(doc => {
    const data = doc.data();
    const card = document.createElement("div");
    card.className = "campaign-card";
    card.innerHTML = `
      <h3>${data.genre}</h3>
      <p><a href="${data.soundcloudUrl}" target="_blank">SoundCloud Track</a></p>
      <p>Credits: ${data.credits}</p>
      <p class="timestamp">${data.createdAt?.toDate().toLocaleString() || "N/A"}</p>
    `;
    campaignContainer.appendChild(card);
  });
});

