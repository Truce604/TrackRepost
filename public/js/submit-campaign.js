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
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ✅ Firebase Config
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

const form = document.getElementById("campaign-form");
const statusBox = document.getElementById("status");
const creditDisplay = document.getElementById("current-credits");
const genreInput = document.getElementById("genre");
const creditsInput = document.getElementById("credits");

// ✅ Extract Artist from URL (Fallback)
function extractArtistFromUrl(url) {
  try {
    const path = new URL(url).pathname;
    const parts = path.split('/');
    return parts[1] || "Unknown Artist";
  } catch (e) {
    return "Unknown Artist";
  }
}

// ✅ Auto Genre Detection
const autoDetectGenre = async (url) => {
  const genres = ["Drum & Bass", "Hip-hop", "Trap", "Techno", "House", "Mash-up", "Pop", "Electronic"];
  const lower = url.toLowerCase();
  return genres.find(g => lower.includes(g.toLowerCase())) || "Pop";
};

// ✅ SoundCloud Metadata Scraper
async function fetchSoundCloudMetadata(url) {
  try {
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
    const html = await res.text();

    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const artistMatch1 = html.match(/<meta name="twitter:audio:artist_name" content="([^"]+)"/);
    const artistMatch2 = html.match(/<meta property="soundcloud:creator" content="([^"]+)"/);
    const artistMatch3 = html.match(/<meta name="twitter:title" content="([^"]+)"/);
    const artworkMatch = html.match(/<meta property="og:image" content="([^"]+)"/);

    const title = titleMatch?.[1] || "Untitled";
    const artist =
      artistMatch1?.[1] ||
      artistMatch2?.[1] ||
      (artistMatch3?.[1]?.includes(" by ") ? artistMatch3[1].split(" by ")[1] : null) ||
      extractArtistFromUrl(url); // ✅ fallback
    const artworkUrl = artworkMatch?.[1] || "";

    return { title, artist, artworkUrl };
  } catch (err) {
    console.error("❌ Failed to fetch SoundCloud metadata", err);
    return {
      title: "Untitled",
      artist: extractArtistFromUrl(url), // ✅ fallback
      artworkUrl: ""
    };
  }
}

// ✅ Auth + Credit + Campaign Flow
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    form.style.display = "none";
    statusBox.textContent = "Please log in to submit a campaign.";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};
  const currentCredits = userData.credits || 0;
  const isPro = userData.isPro || false;

  creditDisplay.textContent = `You currently have ${currentCredits} credits.`;

  const existingCampaigns = await getDocs(query(collection(db, "campaigns"), where("userId", "==", user.uid)));
  if (!isPro && existingCampaigns.size >= 1) {
    form.style.display = "none";
    statusBox.innerHTML = `⚠️ Free users can only run 1 campaign. <a href="pro-plan.html">Upgrade to Pro</a> to run more.`;
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusBox.textContent = "⏳ Submitting your campaign...";

    const trackUrl = form.trackUrl.value.trim();
    const genre = genreInput.value.trim() || await autoDetectGenre(trackUrl);
    const credits = parseInt(creditsInput.value.trim(), 10);

    if (!trackUrl || isNaN(credits) || credits <= 0) {
      statusBox.textContent = "❌ Please enter a valid track URL and credit amount.";
      return;
    }

    if (currentCredits < credits) {
      statusBox.textContent = "❌ You don't have enough credits.";
      return;
    }

    const meta = await fetchSoundCloudMetadata(trackUrl);
    console.log("🎧 Track Meta:", meta);

    const campaignId = `${user.uid}_${Date.now()}`;
    const campaignRef = doc(db, "campaigns", campaignId);

    try {
      // Step 1: Create campaign
      await setDoc(campaignRef, {
        userId: user.uid,
        trackUrl,
        genre,
        credits,
        createdAt: new Date().toISOString(),
        title: meta.title,
        artist: meta.artist,
        artworkUrl: meta.artworkUrl
      });
      console.log("✅ Step 1: Campaign added");

      // Step 2: Deduct credits
      await updateDoc(userRef, {
        credits: currentCredits - credits
      });
      console.log("✅ Step 2: Credits updated");

      // Step 3: Log transaction
      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        type: "spent",
        amount: credits,
        reason: `Submitted: ${meta.title}`,
        timestamp: new Date()
      });
      console.log("✅ Step 3: Transaction logged");

      statusBox.textContent = "✅ Campaign submitted successfully!";
      form.reset();
      genreInput.value = "";
    } catch (err) {
      console.error("❌ Firestore submission failed:", err);
      statusBox.textContent = "❌ Error submitting campaign.";
    }
  });
});
