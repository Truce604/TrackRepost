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

import { firebaseConfig } from "../firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const container = document.getElementById("repost-container");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    container.innerHTML = `<p>⚠️ Please log in to view campaigns.</p>`;
    return;
  }

  try {
    const q = query(
      collection(db, "campaigns"),
      where("credits", ">", 0),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    container.innerHTML = "";

    let found = false;

    snapshot.forEach(doc => {
      const data = doc.data();

      if (data.userId === user.uid) return; // ⛔ Skip user's own campaign

      const card = document.createElement("div");
      card.className = "campaign-card";
      card.innerHTML = `
        <h3>${data.genre}</h3>
        <p><a href="${data.trackUrl}" target="_blank">🎵 Listen</a></p>
        <p>💰 Credits: ${data.credits}</p>
        <a href="repost-action.html?id=${doc.id}" class="button">🔁 Repost This Track</a>
      `;
      container.appendChild(card);
      found = true;
    });

    if (!found) {
      container.innerHTML = `<p>No campaigns available to repost right now.</p>`;
    }

  } catch (err) {
    console.error("Error loading campaigns:", err);
    container.innerHTML = `<p>❌ Error loading repost campaigns.</p>`;
  }
});
