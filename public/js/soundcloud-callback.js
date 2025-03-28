import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

const statusBox = document.getElementById("status");

// Parse the `code` param from SoundCloud
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get("code");

if (!code) {
  statusBox.textContent = "Missing authorization code from SoundCloud.";
  throw new Error("Missing code.");
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    statusBox.textContent = "You must be logged in to finish connecting your SoundCloud account.";
    return;
  }

  try {
    const response = await fetch("/api/soundcloud/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, uid: user.uid }),
    });

    const result = await response.json();

    if (response.ok) {
      statusBox.textContent = "✅ SoundCloud account connected!";
      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 1500);
    } else {
      console.error(result);
      statusBox.textContent = "❌ Connection failed. Please try again.";
    }
  } catch (err) {
    console.error(err);
    statusBox.textContent = "❌ Something went wrong.";
  }
});
