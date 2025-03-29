import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
const db = getFirestore(app);
const auth = getAuth(app);

function getAccessTokenFromHash() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get("access_token");
}

async function fetchSoundCloudProfile(token) {
  const response = await fetch("https://api.soundcloud.com/me", {
    headers: {
      Authorization: `OAuth ${token}`
    }
  });

  if (!response.ok) throw new Error("Failed to fetch SoundCloud profile");
  return response.json();
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const token = getAccessTokenFromHash();
  if (!token) {
    alert("Missing SoundCloud access token.");
    return;
  }

  try {
    const profile = await fetchSoundCloudProfile(token);

    const userData = {
      soundcloudId: profile.id,
      soundcloudUsername: profile.username,
      soundcloudUrl: profile.permalink_url,
      soundcloudFollowers: profile.followers_count,
      soundcloudAvatar: profile.avatar_url,
      soundcloudBio: profile.description || "",
      soundcloudToken: token, // optional to store for reposting
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, "users", user.uid), userData, { merge: true });

    window.location.href = "submit-campaign.html";
  } catch (error) {
    console.error("SoundCloud connect failed:", error);
    alert("Error connecting to SoundCloud. Try again.");
  }
});

