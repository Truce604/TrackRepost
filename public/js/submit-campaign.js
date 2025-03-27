// public/submit-campaign.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw", 
    authDomain: "trackrepost-921f8.firebaseapp.com", 
    projectId: "trackrepost-921f8", 
    storageBucket: "trackrepost-921f8.appspot.com", 
    messagingSenderId: "967836604288", 
    appId: "1:967836604288:web:3782d50de7384c9201d365", 
    measurementId: "G-G65Q3HC3R8" 
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const genreInput = document.getElementById("genre");
const form = document.getElementById("campaign-form");
const statusBox = document.getElementById("status");

// Auto-detect genre (mocked logic for now, replace with real API once available)
const autoDetectGenre = async (url) => {
  try {
    const trackTitle = url.toLowerCase();
    const genres = [
      "Alternative Rock", "Ambient", "Classical", "Country", "Dance & EDM", "Dancehall",
      "Deep House", "Disco", "Drum & Bass", "Dubstep", "Electronic", "Folk & Singer-Songwriter",
      "Hip-hop & Rap", "House", "Indie", "Jazz & Blues", "Latin", "Metal", "Piano",
      "Pop", "R&B & Soul", "Reggae", "Reggaeton", "Rock", "Soundtrack", "Techno",
      "Trance", "Trap", "Triphop", "World"
    ];

    const match = genres.find((g) => trackTitle.includes(g.toLowerCase()));
    return match || "Pop"; // fallback default
  } catch (error) {
    console.error("Genre detection failed", error);
    return "Pop";
  }
};

form.trackUrl.addEventListener("change", async () => {
  const genre = await autoDetectGenre(form.trackUrl.value);
  genreInput.value = genre;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const trackUrl = form.trackUrl.value;
  const genre = genreInput.value;
  const credits = parseInt(form.credits.value);

  statusBox.classList.remove("hidden");
  statusBox.textContent = "Submitting...";

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      statusBox.textContent = "You must be logged in to submit a campaign.";
      return;
    }

    try {
      const campaignRef = doc(db, "campaigns", `${user.uid}_${Date.now()}`);
      await setDoc(campaignRef, {
        userId: user.uid,
        trackUrl,
        genre,
        credits,
        createdAt: new Date().toISOString(),
      });

      statusBox.textContent = "✅ Campaign submitted successfully!";
      form.reset();
      genreInput.value = "";
    } catch (error) {
      console.error("Error submitting campaign:", error);
      statusBox.textContent = "❌ Submission failed. Try again.";
    }
  });
});
