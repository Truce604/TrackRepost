import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const genreInput = document.getElementById("genre");
const form = document.getElementById("campaign-form");
const statusBox = document.getElementById("status");
const creditDisplay = document.getElementById("current-credits");

// Auto genre guess
const autoDetectGenre = async (url) => {
  const genres = [
    "Alternative Rock", "Ambient", "Classical", "Country", "Dance & EDM",
    "Dancehall", "Deep House", "Disco", "Drum & Bass", "Dubstep",
    "Electronic", "Folk & Singer-Songwriter", "Hip-hop & Rap", "House",
    "Indie", "Jazz & Blues", "Latin", "Metal", "Piano", "Pop",
    "R&B & Soul", "Reggae", "Reggaeton", "Rock", "Soundtrack",
    "Techno", "Trance", "Trap", "Triphop", "World"
  ];
  const match = genres.find(g => url.toLowerCase().includes(g.toLowerCase()));
  return match || "Pop";
};

// On track URL change, detect genre
form.trackUrl.addEventListener("change", async () => {
  const genre = await autoDetectGenre(form.trackUrl.value);
  genreInput.value = genre;
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    statusBox.textContent = "Please log in to submit.";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};
  const credits = userData.credits || 0;
  const isPro = userData.isPro || false;

  creditDisplay.textContent = `You have ${credits} credits.`;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusBox.textContent = "Checking campaign limit...";

    const trackUrl = form.trackUrl.value;
    const genre = genreInput.value;

    // Fetch user's existing campaigns
    const campaignsRef = collection(db, "campaigns");
    const q = query(campaignsRef, where("userId", "==", user.uid));
    const snapshot = await getDocs(q);
    const totalCampaigns = snapshot.size;

    const limit = isPro ? 3 : 1;

    if (totalCampaigns >= limit) {
      statusBox.textContent = `❌ Limit reached. Free users can submit 1 campaign. Upgrade to Pro for more.`;
      return;
    }

    try {
      const campaignRef = doc(db, "campaigns", `${user.uid}_${Date.now()}`);
      await setDoc(campaignRef, {
        userId: user.uid,
        trackUrl,
        genre,
        credits: 0,
        createdAt: new Date().toISOString()
      });

      statusBox.textContent = "✅ Campaign submitted!";
      form.reset();
      genreInput.value = "";
    } catch (err) {
      console.error(err);
      statusBox.textContent = "❌ Failed to submit.";
    }
  });
});





