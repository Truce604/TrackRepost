// public/js/auth-check.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { firebaseConfig } from "../firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

onAuthStateChanged(auth, async (user) => {
  const loginUI = document.getElementById("login-ui");

  if (user) {
    if (loginUI) loginUI.style.display = "none"; // hide login prompt
  } else {
    if (loginUI) loginUI.style.display = "block";
  }
});

window.loginWithGoogle = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Login failed:", error);
  }
};
