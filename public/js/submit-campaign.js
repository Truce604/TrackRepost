firebase.initializeApp(window.firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

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
  return genres.find(g => lower.includes(g.toLowerCase())) || "Pop";
};

const fetchSoundCloudMetadata = async (trackUrl) => {
  try {
    const res = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(trackUrl)}`);
    const data = await res.json();

    const titleRaw = data.title || "";
    const thumbnail = data.thumbnail_url || "";
    let title = titleRaw;
    let artist = "Unknown Artist";

    if (titleRaw.includes(" by ")) {
      const parts = titleRaw.split(" by ");
      title = parts[0].trim();
      artist = parts[1]?.split(" ·")[0].trim() || artist;
    }

    return {
      title,
      artist,
      artworkUrl: thumbnail
    };
  } catch (err) {
    console.error("❌ Metadata fetch failed:", err);
    return {
      title: "Untitled Track",
      artist: "Unknown Artist",
      artworkUrl: ""
    };
  }
};

form.trackUrl.addEventListener("change", async () => {
  const genre = await autoDetectGenre(form.trackUrl.value);
  genreInput.value = genre;
});

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    form.style.display = "none";
    statusBox.textContent = "Please log in to submit a campaign.";
    return;
  }

  const userRef = db.collection("users").doc(user.uid);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? userSnap.data() : {};
  const isPro = userData.isPro || false;
  const currentCredits = userData.credits || 0;

  creditDisplay.textContent = `You currently have ${currentCredits} credits.`;

  const campaignQuery = db.collection("campaigns").where("userId", "==", user.uid);
  const campaignSnap = await campaignQuery.get();
  if (!isPro && campaignSnap.size >= 1) {
    form.style.display = "none";
    statusBox.innerHTML = `⚠️ Free users can only run 1 campaign. <a href="pro-plan.html">Upgrade to Pro</a> to run more.`;
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusBox.textContent = "Submitting...";

    const trackUrl = form.trackUrl.value.trim();
    const genre = genreInput.value.trim();
    const credits = parseInt(form.credits.value);

    if (!trackUrl || !genre || isNaN(credits) || credits < 1) {
      statusBox.textContent = "❌ Please fill out all fields correctly.";
      return;
    }

    if (currentCredits < credits) {
      statusBox.textContent = "❌ Not enough credits in your account.";
      return;
    }

    try {
      const meta = await fetchSoundCloudMetadata(trackUrl);
      const campaignId = `${user.uid}_${Date.now()}`;

      const campaignData = {
        userId: user.uid,
        trackUrl,
        genre,
        credits,
        createdAt: new Date().toISOString(),
        title: meta.title,
        artist: meta.artist,
        artworkUrl: meta.artworkUrl
      };

      // 🔎 DEBUG: Log all data before submitting
      console.log("🟡 Submitting Campaign:");
      Object.entries(campaignData).forEach(([key, value]) => {
        console.log(`  ${key} (${typeof value}):`, value);
      });

      const campaignRef = db.collection("campaigns").doc(campaignId);
      await campaignRef.set(campaignData);

      await userRef.update({
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





