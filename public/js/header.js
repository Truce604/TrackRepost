// /js/header.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw",
  authDomain: "trackrepost-921f8.firebaseapp.com",
  projectId: "trackrepost-921f8",
  storageBucket: "trackrepost-921f8.appspot.com",
  messagingSenderId: "967836604288",
  appId: "1:967836604288:web:3782d50de7384c9201d365",
  measurementId: "G-G65Q3HC3R8"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ✅ Insert header
const siteHeader = document.getElementById("site-header");
siteHeader.innerHTML = `
  <div class="site-header-inner" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; padding: 10px 20px; background: #1a1a1a; color: white;">
    <h1 class="logo" style="margin: 0; font-size: 22px;">
      <a href="index.html" style="color: #ffd700; text-decoration: none;">🎧 TrackRepost</a>
    </h1>
    <nav style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
      <a href="dashboard.html" style="color: #fff; text-decoration: none;">Dashboard</a>
      <a href="submit-campaign.html" style="color: #fff; text-decoration: none;">Submit</a>
      <a href="repost.html" style="color: #fff; text-decoration: none;">Repost</a>
      <a href="credits.html" style="color: #fff; text-decoration: none;">Buy Credits</a>
      <a href="my-boosts.html" style="color: #fff; text-decoration: none;">My Boosts</a>
    </nav>
    <div id="auth-controls" style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
      <span id="user-info" style="font-size: 14px;"></span>
      <button id="auth-button" style="padding: 6px 12px; border: none; background: #444; color: white; border-radius: 5px; cursor: pointer;">Loading...</button>
    </div>
  </div>
`;

// ✅ Auth controls
const authButton = document.getElementById("auth-button");
const userInfo = document.getElementById("user-info");

onAuthStateChanged(auth, (user) => {
  if (user) {
    userInfo.textContent = `Logged in as ${user.displayName || user.email}`;
    authButton.textContent = "Logout";
    authButton.onclick = async () => {
      await signOut(auth);
      window.location.href = "index.html";
    };
  } else {
    userInfo.textContent = "";
    authButton.textContent = "Login";
    authButton.onclick = () => signInWithPopup(auth, provider);
  }
});
