// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw",
  authDomain: "trackrepost-921f8.firebaseapp.com",
  projectId: "trackrepost-921f8",
  storageBucket: "trackrepost-921f8.appspot.com",
  messagingSenderId: "967836604288",
  appId: "1:967836604288:web:3782d50de7384c9201d365",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Reference form
const campaignForm = document.getElementById("campaign-form");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("Please sign in first.");
    window.location.href = "/index.html";
  }

  campaignForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const genre = document.getElementById("genre").value.trim();
    const trackUrl = document.getElementById("trackUrl").value.trim();
    const credits = parseInt(document.getElementById("credits").value);
    const notes = document.getElementById("notes").value.trim();

    if (!title || !genre || !trackUrl || isNaN(credits)) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const campaignId = `${user.uid}_${Date.now()}`;
      await setDoc(doc(db, "campaigns", campaignId), {
        userId: user.uid,
        title,
        genre,
        trackUrl,
        credits,
        notes,
        createdAt: serverTimestamp(),
        remainingCredits: credits,
      });

      alert("Campaign submitted!");
      campaignForm.reset();
      window.location.href = "/dashboard.html";
    } catch (error) {
      console.error("Error submitting campaign:", error);
      alert("Error submitting campaign. Check console for details.");
    }
  });
});
