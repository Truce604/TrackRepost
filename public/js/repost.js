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
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Config
import { firebaseConfig } from "../firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const historyContainer = document.getElementById("repost-history");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    historyContainer.innerHTML = "<p>Please log in to view your repost history.</p>";
    return;
  }

  try {
    const q = query(
      collection(db, "reposts"),
      where("userId", "==", user.uid)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      historyContainer.innerHTML = "<p>You haven’t reposted any tracks yet.</p>";
      return;
    }

    historyContainer.innerHTML = "";
    snapshot.forEach(async (docSnap) => {
      const data = docSnap.data();

      const earnedCredits = 
        Math.floor((await getDoc(doc(db, "users", user.uid))).data().followers / 100) +
        (data.like ? 1 : 0) +
        (data.follow ? 2 : 0) +
        (data.comment ? 2 : 0);

      const card = document.createElement("div");
      card.className = "campaign-card";
      card.innerHTML = `
        <h3><a href="${data.trackUrl}" target="_blank">Track</a></h3>
        <p><strong>Credits Earned:</strong> ${earnedCredits}</p>
        <p><strong>Liked:</strong> ${data.like ? "✅" : "❌"}</p>
        <p><strong>Followed:</strong> ${data.follow ? "✅" : "❌"}</p>
        <p><strong>Commented:</strong> ${data.comment ? `"${data.commentText}"` : "❌"}</p>
        <p class="timestamp">${data.timestamp?.toDate().toLocaleString() || "Unknown time"}</p>
      `;
      historyContainer.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load reposts:", err);
    historyContainer.innerHTML = "<p>❌ Error loading repost history.</p>";
  }
});

