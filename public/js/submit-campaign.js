// public/js/submit-campaign.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ✅ Firebase Config (automatically loaded from firebaseConfig.js)
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById("campaign-form");
const trackUrlInput = document.getElementById("trackUrl");
const genreInput = document.getElementById("genre");
const statusBox = document.getElementById("status");
const creditDisplay = document.getElementById("current-credits");

// 👤 Wait for user to log in
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    form.style.display = "none";
    statusBox.textContent = "⚠️ You must be logged in to submit a campaign.";
    return;
  }

  // 🧮 Load current credits
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const credits = userSnap.exists() ? userSnap.data().credits || 0 : 0;
    creditDisplay.textContent = `You currently have ${credits} credits.`;
  } catch (err) {
    console.error("Error loading credits:", err);
    creditDisplay.textContent = "Couldn't load credits.";
  }

  // 📣 Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const trackUrl = trackUrlInput.value.trim();
    if (!trackUrl) {
      statusBox.textContent = "Please enter a valid SoundCloud track URL.";
      return;
    }

    // 🔍 Auto-detect genre (simple keyword matching)
    const genres = [
      "Alternative Rock", "Ambient", "Classical", "Country", "Dance & EDM", "Dancehall",
      "Deep House", "Disco", "Drum & Bass", "Dubstep", "Electronic", "Folk & Singer-Songwriter",
      "Hip-hop & Rap", "House", "Indie", "Jazz & Blues", "Latin", "Metal", "Piano",
      "Pop", "R&B & Soul", "Reggae", "Reggaeton", "Rock", "Soundtrack", "Techno",
      "Trance", "Trap", "Triphop", "World"
    ];
    const genre = genres.find(g => trackUrl.toLowerCase().includes(g.toLowerCase())) || "Pop";
    genreInput.value = genre;

    // 📤 Submit to Firestore
    try {
      statusBox.textContent = "Submitting campaign...";

      const campaignRef = doc(db, "campaigns", `${user.uid}_${Date.now()}`);
      await setDoc(campaignRef, {
        owner: user.uid,
        track: trackUrl,
        genre: genre,
        credits: 0,
        createdAt: new Date().toISOString(),
      });

      statusBox.textContent = "✅ Campaign submitted successfully!";
      form.reset();
      genreInput.value = "";
    } catch (err) {
      console.error("Error submitting campaign:", err);
      statusBox.textContent = "❌ Submission failed. Please try again.";
    }
  });
});

