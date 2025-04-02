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
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById("campaign-form");
const statusBox = document.getElementById("status");
const creditDisplay = document.getElementById("current-credits");
const genreInput = document.getElementById("genre");

const autoDetectGenre = async (url) => {
  const genres = [
    "Alternative Rock", "Ambient", "Classical", "Country", "Dance & EDM", "Dancehall",
    "Deep House", "Disco", "Drum & Bass", "Dubstep", "Electronic", "Folk & Singer-Songwriter",
    "Hip-hop & Rap", "House", "Indie", "Jazz & Blues", "Latin", "Metal", "Piano",
    "Pop", "R&B & Soul", "Reggae", "Reggaeton", "Rock", "Soundtrack", "Techno",
    "Trance", "Trap", "Triphop", "World"
  ];
  const lower = url.toLowerCase();
  const match = genres.find(g => lower.includes(g.toLowerCase()));
  return match || "Pop";
};

const fetchSoundCloudMetadata = async (trackUrl) => {
  try {
    const res = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(trackUrl)}`);
    const data = await res.json();

    const img = data.thumbnail_url;
    const title = data.title;
    const html = data.html;
    const artistMatch = html.match(/soundcloud.com\/([^/?"]+)/i);
    const artist = artistMatch ? artistMatch[1] : "Unknown";

    return {
      artworkUrl: img,
      title,
      artist
    };
  } catch (err) {
    console.error("⚠️ Failed to fetch SoundCloud metadata:", err);
    return {
      artworkUrl: "",
      title: "Unknown Title",
      artist: "Unknown Artist"
    };
  }
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

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};
  const isPro = userData.isPro || false;
  const currentCredits = userData.credits || 0;
  creditDisplay.textContent = `You currently have ${currentCredits} credits.`;

  const campaignQuery = query(
    collection(db, "campaigns"),
    where("userId", "==", user.uid)
  );
  const campaignSnap = await getDocs(campaignQuery);
  const activeCampaignCount = campaignSnap.size;

  if (!isPro && activeCampaignCount >= 1) {
    form.style.display = "none";
    statusBox.innerHTML = `⚠️ Free users can only run 1 campaign. <a href="pro-plan.html">Upgrade to Pro</a> to run more.`;
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusBox.textContent = "Submitting...";
    console.log("🟡 Submit triggered");

    const trackUrl = form.trackUrl.value.trim();
    const genre = genreInput.value.trim();
    const credits = parseInt(form.credits.value);

    console.log("URL:", trackUrl);
    console.log("Genre:", genre);
    console.log("Credits:", credits);
    console.log("User ID:", user.uid);

    if (!trackUrl || !genre || isNaN(credits) || credits < 1) {
      statusBox.textContent = "❌ All fields are required and credits must be 1 or more.";
      return;
    }

    if (currentCredits < credits) {
      statusBox.textContent = "❌ Not enough credits in your account.";
      return;
    }

    try {
      const meta = await fetchSoundCloudMetadata(trackUrl);

      const campaignRef = doc(db, "campaigns", `${user.uid}_${Date.now()}`);
      console.log("✅ Reached setDoc, submitting to Firestore...");

      await setDoc(campaignRef, {
        userId: user.uid,
        trackUrl,
        genre,
        credits,
        createdAt: new Date().toISOString(),
        artworkUrl: meta.artworkUrl,
        title: meta.title,
        artist: meta.artist
      });

      await updateDoc(userRef, {
        credits: currentCredits - credits
      });

      statusBox.textContent = "✅ Campaign submitted!";
      form.reset();
      genreInput.value = "";
    } catch (err) {
      console.error("❌ Firestore submission failed:", err);
      statusBox.textContent = "❌ Failed to submit campaign.";
    }
  });
});





