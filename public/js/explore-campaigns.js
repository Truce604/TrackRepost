import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "xxx",
  authDomain: "xxx",
  projectId: "xxx",
  storageBucket: "xxx",
  messagingSenderId: "xxx",
  appId: "xxx"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const container = document.getElementById("explore-campaigns");

const loadCampaigns = async () => {
  container.innerHTML = "<p>Loading campaigns...</p>";

  try {
    const q = query(collection(db, "campaigns"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      container.innerHTML = "<p>No campaigns available yet.</p>";
      return;
    }

    container.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement("div");
      card.className = "campaign-card";
      card.innerHTML = `
        <h3>${data.genre}</h3>
        <p><a href="${data.trackUrl}" target="_blank">🎵 Listen on SoundCloud</a></p>
        <p>Campaign Owner: ${data.userId}</p>
        <p>Available Credits: ${data.credits || 0}</p>
        <p class="timestamp">${new Date(data.createdAt).toLocaleString()}</p>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading campaigns", err);
    container.innerHTML = "<p>Failed to load campaigns.</p>";
  }
};

loadCampaigns();
