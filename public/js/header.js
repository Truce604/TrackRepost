import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
const provider = new GoogleAuthProvider();

const siteHeader = document.getElementById("site-header");
siteHeader.innerHTML = `
  <div class="site-header-inner">
    <h1 class="logo"><a href="/">🎧 TrackRepost</a></h1>
    <div id="auth-controls">
      <span id="user-info"></span>
      <button id="auth-button">Loading...</button>
    </div>
  </div>
`;

const authButton = document.getElementById("auth-button");
const userInfo = document.getElementById("user-info");

onAuthStateChanged(auth, (user) => {
  if (user) {
    userInfo.textContent = `Logged in as ${user.displayName || user.email}`;
    authButton.textContent = "Logout";
    authButton.onclick = () => signOut(auth);
  } else {
    userInfo.textContent = "";
    authButton.textContent = "Login";
    authButton.onclick = () => signInWithPopup(auth, provider);
  }
});
