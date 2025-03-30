// public/js/submit-campaign.js
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
  query,
  where,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from "../firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const genreInput = document.getElementById("genre");
const form = document.getElementById("campaign-form");
const statusBox = document.getElementById("status");
const creditDisplay = document.getElementById("current-credits");

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

form.trackUrl.addEventListener("change", async () => {
  const genre = await autoDetectGenre(form.trackUrl.value);
  genreInput.value = genre;
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    form.style.display = "none";
    statusBox.textContent = "Please log in to submit a campaign.";
    return;
  }

  // 🔐 Get user profile
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};
  const credits = userData.credits || 0;
  const isPro = userData.isPro || false;

  creditDisplay.textContent = `You currently have ${credits} credits.`;

  // 🔐 Check for existing campaigns
  const campaignQuery = query(
    collection(db, "campaigns"),
    where("userId", "==", user.uid)
  );
  const campaignSnap = await getDocs(campaignQuery);
  const hasCampaign = !campaignSnap.empty;

  if (!isPro && hasCampaign) {
    form.style.display = "none";
    statusBox.textContent = "⚠️ Free users can only run 1 campaign. Upgrade to Pro to submit more.";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const trackUrl = form.trackUrl.value;
    const genre = genreInput.value;

    statusBox.classList.remove("hidden");
    statusBox.textContent = "Submitting...";

    try {
      const campaignRef = doc(db, "campaigns", `${user.uid}_${Date.now()}`);
      await setDoc(campaignRef, {
        userId: user.uid,
        trackUrl,
        genre,
        credits: 0,
        createdAt: new Date().toISOString(),
      });

      statusBox.textContent = "✅ Campaign submitted successfully!";
      form.reset();
      genreInput.value = "";
    } catch (err) {
      console.error("Submission error:", err);
      statusBox.textContent = "❌ Submission failed. Please try again.";
    }
  });
});






