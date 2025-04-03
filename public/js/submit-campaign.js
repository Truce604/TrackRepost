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
  getDocs,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ✅ Firebase Config
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById("campaign-form");
const statusBox = document.getElementById("status");
const creditDisplay = document.getElementById("current-credits");
const genreInput = document.getElementById("genre");
const trackUrlInput = document.getElementById("trackUrl");
const creditsInput = document.getElementById("credits");

// ✅ Auto genre from SoundCloud URL
const autoDetectGenre = async (url) => {
  const genres = [
    "Alternative Rock", "Ambient", "Classical", "Country", "Dance & EDM", "Dancehall",
    "Deep House", "Disco", "Drum & Bass", "Dubstep", "Electronic", "Folk & Singer-Songwriter",
    "Hip-hop & Rap", "House", "Indie", "Jazz & Blues", "Latin", "Metal", "Piano",
    "Pop", "R&B & Soul", "Reggae", "Reggaeton", "Rock", "Soundtrack", "Techno",
    "Trance", "Trap", "Triphop", "World", "Mash-up", "DJ Tools"
  ];
  const lower = url.toLowerCase();
  const match = genres.find(g => lower.includes(g.toLowerCase()));
  return match || "Pop";
};

// ✅ Extract SoundCloud details
const parseSoundCloud = (url) => {
  const parts = url.split("/").filter(Boolean);
  const artist = parts.length >= 4 ? parts[3].split("?")[0] : "Unknown";
  const titleRaw = parts.length >= 5 ? parts[4].split("?")[0].replace(/-/g, " ") : "Untitled";
  const title = decodeURIComponent(titleRaw).replace(/_/g, " ").trim();

  const artworkUrl = `https://i1.sndcdn.com/artworks-000000000000-0-t500x500.jpg`; // Fallback
  return { artist, title, artworkUrl };
};

trackUrlInput.addEventListener("change", async () => {
  const genre = await autoDetectGenre(trackUrlInput.value);
  genreInput.value = genre;
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    form.style.display = "none";
    statusBox.textContent = "Please log in to submit a campaign.";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};
  const isPro = userData.isPro || false;
  const currentCredits = userData.credits || 0;
  creditDisplay.textContent = `You currently have ${currentCredits} credits.`;

  // 🔐 Campaign limit for free users
  const q = query(collection(db, "campaigns"), where("userId", "==", user.uid));
  const campaignSnap = await getDocs(q);
  if (!isPro && campaignSnap.size >= 1) {
    form.style.display = "none";
    statusBox.innerHTML = `⚠️ Free users can only run 1 campaign. <a href="pro-plan.html">Upgrade to Pro</a> to run more.`;
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const trackUrl = trackUrlInput.value.trim();
    const genre = genreInput.value.trim();
    const credits = parseInt(creditsInput.value.trim());

    if (!trackUrl || !genre || !credits || isNaN(credits)) {
      statusBox.textContent = "❌ Please fill in all fields correctly.";
      return;
    }

    if (currentCredits < credits) {
      statusBox.textContent = `❌ You only have ${currentCredits} credits, but you're trying to spend ${credits}.`;
      return;
    }

    const { title, artist, artworkUrl } = parseSoundCloud(trackUrl);
    const campaignId = `${user.uid}_${Date.now()}`;

    const campaignData = {
      userId: user.uid,
      trackUrl,
      genre,
      credits,
      createdAt: new Date().toISOString(),
      title,
      artist,
      artworkUrl
    };

    try {
      console.log("🟡 Submitting Campaign:", campaignData);

      // ⬆️ Submit campaign
      await setDoc(doc(db, "campaigns", campaignId), campaignData);

      // ⬇️ Subtract credits
      await updateDoc(userRef, {
        credits: currentCredits - credits
      });

      // 💰 Log transaction
      await setDoc(doc(db, "transactions", `${user.uid}_${Date.now()}`), {
        userId: user.uid,
        type: "spent",
        amount: credits,
        reason: `Launched campaign: ${title}`,
        timestamp: serverTimestamp()
      });

      statusBox.textContent = "✅ Campaign submitted successfully!";
      form.reset();
      genreInput.value = "";

    } catch (err) {
      console.error("❌ Firestore submission failed:", err);
      statusBox.textContent = "❌ Error submitting campaign.";
    }
  });
});





