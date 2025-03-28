import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 🔐 Replace with your config
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

const messageEl = document.getElementById("successMessage");

// ✅ Parse URL query parameters (e.g. ?credits=500)
const urlParams = new URLSearchParams(window.location.search);
const credits = urlParams.get("credits") || "some";
const amount = urlParams.get("amount");

onAuthStateChanged(auth, (user) => {
  let displayName = user?.displayName || "friend";
  messageEl.textContent = `Hey ${displayName}, you purchased ${credits} credits! 🎉`;

  // Optionally add a follow-up link
  const link = document.createElement("a");
  link.href = "/dashboard.html";
  link.textContent = "👉 Go to your dashboard";
  link.style.display = "block";
  link.style.marginTop = "1rem";
  messageEl.appendChild(link);
});
