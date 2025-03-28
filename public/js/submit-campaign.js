// public/submit-campaign.js
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

const firebaseConfig = {
  apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw", 
    authDomain: "trackrepost-921f8.firebaseapp.com", 
    projectId: "trackrepost-921f8", 
    storageBucket: "trackrepost-921f8.appspot.com", 
    messagingSenderId: "967836604288", 
    appId: "1:967836604288:web:3782d50de7384c9201d365", 
    measurementId: "G-G65Q3HC3R8" 
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ DOM Elements
const genreInput = document.getElementById("genre");
const form = document.getElementById("campaign-form");
const statusBox = document.getElementById("status");
const creditDisplay = document.getElementById("current-credits");

// ✅ Auto-detect genre from track URL (mocked with title keywords)
const autoDetectGenre = async (url) => {
  const genres = [
    "Alternative Rock", "Ambient", "Classical", "Country", "Dance & EDM", "Dancehall",
    "Deep House", "Disco", "Drum & Bass", "Dubstep", "Electronic", "Folk & Singer-Songwriter",
    "Hip-hop & Rap", "House", "Indie", "Jazz & Blues", "Latin", "Metal", "Piano",
    "Pop", "R&B & Soul", "Reggae", "Reggaeton", "Rock", "Soundtrack", "Techno",
    "Trance", "Trap", "Triphop", "World"
  ];
  const title = url.toLowerCase();
  const match = genres.find((g) => title.includes(g.toLowerCase()));
  return match || "Pop";
};

// ✅ Detect genre when SoundCloud URL changes
form.trackUrl.addEventListener("change", async () => {
  const genre = await autoDetectGenre(form.trackUrl.value);
  genreInput.value = genre;
});

// ✅ Auth state logic
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    form.style.display = "none";
    statusBox.textContent = "Please log in to submit a campaign.";
    return;
  }

  // ✅ Get current credits from user profile
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const credits = userSnap.exists() ? userSnap.data().credits || 0 : 0;
  creditDisplay.textContent = `You currently have ${credits} credits.`;

  // ✅ Form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusBox.classList.remove("hidden");
    statusBox.textContent = "Submitting...";

    const trackUrl = form.trackUrl.value;
    const genre = genreInput.value;

    try {
      const campaignId = `${user.uid}_${Date.now()}`;
      const campaignRef = doc(db, "campaigns", campaignId);
      await setDoc(campaignRef, {
        userId: user.uid,
        trackUrl,
        genre,
        credits: 0,
        createdAt: new Date().toISOString()
      });

      statusBox.textContent = "✅ Campaign submitted successfully!";
      form.reset();
      genreInput.value = "";
    } catch (error) {
      console.error("❌ Submission failed:", error);
      statusBox.textContent = "❌ Submission failed. Try again.";
    }
  });
});
