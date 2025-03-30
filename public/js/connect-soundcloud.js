import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc
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
  status.textContent = "🔍 Fetching profile...";

  const profileUrl = form.soundcloudUrl.value;
  const match = profileUrl.match(/soundcloud\.com\/([^\/\s]+)/);

  if (!match) {
    status.textContent = "❌ Invalid SoundCloud URL.";
    return;
  }

  const handle = match[1];
  const apiUrl = `https://soundcloud.com/${handle}`;

  try {
    const response = await fetch(apiUrl);
    const html = await response.text();

    const displayNameMatch = html.match(/<title>([^<]+)\| Listen/);
    const bioMatch = html.match(/<meta name="description" content="([^"]+)"/);
    const followersMatch = html.match(/([0-9,]+)\s+followers/i);

    const displayName = displayNameMatch ? displayNameMatch[1].trim() : handle;
    const bio = bioMatch ? bioMatch[1].trim() : "No bio found";
    const followers = followersMatch ? parseInt(followersMatch[1].replace(/,/g, '')) : 0;

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        status.textContent = "❌ You must be logged in.";
        return;
      }

      await setDoc(doc(db, "users", user.uid), {
        soundcloud: {
          handle,
          url: profileUrl,
          displayName,
          bio,
          followers
        }
      }, { merge: true });

      status.textContent = `✅ Connected to @${handle} with ${followers} followers!`;
    });
  } catch (err) {
    console.error(err);
    status.textContent = "❌ Failed to fetch profile.";
  }
});


