import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const token = localStorage.getItem("soundcloud_access_token");

async function fetchSoundCloudUserData(token) {
  try {
    const res = await fetch("https://api.soundcloud.com/me", {
      headers: {
        Authorization: `OAuth ${token}`
      }
    });

    if (!res.ok) throw new Error("Failed to fetch SoundCloud user data");

    const data = await res.json();

    return {
      username: data.username,
      soundcloudId: data.id,
      followers: data.followers_count || 0
    };
  } catch (err) {
    console.error("SoundCloud fetch error:", err);
    return null;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user || !token) return;

  const soundcloudUser = await fetchSoundCloudUserData(token);

  if (soundcloudUser) {
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        soundcloudUsername: soundcloudUser.username,
        soundcloudId: soundcloudUser.soundcloudId,
        followers: soundcloudUser.followers,
        lastSynced: new Date().toISOString()
      });
      console.log("✅ Synced SoundCloud user data to Firestore");
    } catch (err) {
      console.error("❌ Firestore update failed:", err);
    }
  }
});