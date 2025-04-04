import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  updateDoc
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById("soundcloud-form");
const status = document.getElementById("status");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  status.textContent = "🔍 Fetching SoundCloud data...";

  const url = form.url.value.trim();
  if (!url.includes("soundcloud.com")) {
    status.textContent = "❌ Invalid SoundCloud URL.";
    return;
  }

  try {
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
    const html = await res.text();

    const handleMatch = url.match(/soundcloud\.com\/([^/?#]+)/);
    const followersMatch = html.match(/(\d[\d,.]*)\s*followers/i);
    const handle = handleMatch?.[1] || "unknown";
    const followersRaw = followersMatch?.[1]?.replace(/,/g, "") || "0";
    const followers = parseInt(followersRaw, 10);

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        status.textContent = "❌ You must be logged in.";
        return;
      }

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        soundcloud: {
          handle,
          url,
          followers
        }
      });

      status.textContent = `✅ Connected! @${handle} (${followers} followers)`;
    });
  } catch (err) {
    console.error("SoundCloud scrape failed:", err);
    status.textContent = "❌ Failed to fetch profile info.";
  }
});

