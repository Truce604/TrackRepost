import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 🔐 Load Firebase config from firebaseConfig.js
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById("campaign-form");
const statusBox = document.getElementById("status");
const creditDisplay = document.getElementById("current-credits");
const genreInput = document.getElementById("genre");

// 🎵 Mocked genre detection based on track URL (will be replaced later)
const autoDetectGenre = async (url) => {
  const genres = [
    "Alternative Rock", "Ambient", "Classical", "Country", "Dance & EDM", "Dancehall",
    "Deep House", "Disco", "Drum & Bass", "Dubstep", "Electronic", "Folk & Singer-Songwriter",
    "Hip-hop & Rap", "House", "Indie", "Jazz & Blues", "Latin", "Metal", "Piano",
    "Pop", "R&B & Soul", "Reggae", "Reggaeton", "Rock", "Soundtrack", "Techno",
    "Trance", "Trap", "Triphop", "World"
  ];
  const title = url.toLowerCase();
  const match = genres.find(g => title.includes(g.toLowerCase()));
  return match || "Pop";
};

// Auto-detect genre on SoundCloud URL input
form.trackUrl.addEventListener("change", async () => {
  const genre = await autoDetectGenre(form.trackUrl.value);
  genreInput.value = genre;
});

// 👤 Wait for auth and then populate credits
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    form.style.display = "none";
    creditDisplay.textContent = "Please log in to submit a campaign.";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const credits = userSnap.exists() ? userSnap.data().credits || 0 : 0;
  creditDisplay.textContent = `You currently have ${credits} credits.`;

  // 🎯 Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const trackUrl = form.trackUrl.value.trim();
    const genre = genreInput.value;

    if (!trackUrl || !genre) {
      statusBox.textContent = "Missing track or genre.";
      statusBox.classList.remove("hidden");
      return;
    }

    statusBox.textContent = "Submitting...";
    statusBox.classList.remove("hidden");

    try {
      const campaignRef = doc(db, "campaigns", `${user.uid}_${Date.now()}`);
      await setDoc(campaignRef, {
        userId: user.uid,
        trackUrl,
        genre,
        credits: 0, // starts at 0 — user will purchase or earn more
        createdAt: new Date().toISOString()
      });

      statusBox.textContent = "✅ Campaign submitted successfully!";
      form.reset();
      genreInput.value = "";
    } catch (err) {
      console.error("❌ Submission failed:", err);
      statusBox.textContent = "❌ Submission failed. Please try again.";
    }
  });
});

