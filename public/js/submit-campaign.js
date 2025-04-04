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

// ✅ Elements
const form = document.getElementById("campaign-form");
const statusBox = document.getElementById("status");
const creditDisplay = document.getElementById("current-credits");
const genreInput = document.getElementById("genre");
const creditsInput = document.getElementById("credits");

// ✅ Auto Genre Detection
const autoDetectGenre = async (url) => {
  const genres = ["Drum & Bass", "Hip-hop", "Trap", "Techno", "House", "Mash-up", "Pop", "Electronic"];
  const lower = url.toLowerCase();
  return genres.find(g => lower.includes(g.toLowerCase())) || "Pop";
};

// ✅ Scrape SoundCloud Metadata
async function fetchSoundCloudMetadata(url) {
  try {
    const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
    const html = await response.text();

    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const artistMatch = html.match(/<meta property="soundcloud:creator" content="([^"]+)"/);
    const artworkMatch = html.match(/<meta property="og:image" content="([^"]+)"/);

    return {
      title: titleMatch?.[1] || "Untitled",
      artist: artistMatch?.[1] || "Unknown Artist",
      artworkUrl: artworkMatch?.[1] || ""
    };
  } catch (err) {
    console.error("❌ Failed to scrape SoundCloud metadata", err);
    return {
      title: "Untitled",
      artist: "Unknown Artist",
      artworkUrl: ""
    };
  }
}

// ✅ Auth State Logic
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

  // ✅ Handle Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusBox.textContent = "🚀 Submitting...";
    console.log("🟡 Submit clicked");

    const trackUrl = form.trackUrl.value.trim();
    const genre = genreInput.value.trim() || await autoDetectGenre(trackUrl);
    const credits = parseInt(creditsInput.value.trim(), 10);

    if (!trackUrl || !credits || credits <= 0) {
      statusBox.textContent = "❌ Track URL and credits are required.";
      return;
    }

    if (currentCredits < credits) {
      statusBox.textContent = "❌ Not enough credits.";
      return;
    }

    const meta = await fetchSoundCloudMetadata(trackUrl);
    console.log("🎧 Track Meta:", meta);

    const campaignId = `${user.uid}_${Date.now()}`;
    const campaignRef = doc(db, "campaigns", campaignId);

    try {
      console.log("🚀 Step 1: Submitting campaign...");
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

      console.log("🚀 Step 2: Updating user credits...");
      await updateDoc(userRef, {
        credits: currentCredits - credits
      });
      console.log("✅ Step 2: Credits updated");

      console.log("🚀 Step 3: Logging transaction...");
      await db.collection("transactions").add({
        userId: user.uid,
        type: "spent",
        amount: credits,
        reason: `Campaign for "${meta.title}"`,
        timestamp: new Date()
      });
      console.log("✅ Step 3: Transaction logged");

      statusBox.textContent = "✅ Campaign submitted!";
      form.reset();
      genreInput.value = "";
    } catch (err) {
      console.error("❌ Firestore submission failed:", err);
      statusBox.textContent = "❌ Error submitting campaign.";
    }
  });
});
