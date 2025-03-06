import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
<<<<<<< HEAD
  // Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw",
  authDomain: "trackrepost-921f8.firebaseapp.com",
  projectId: "trackrepost-921f8",
  storageBucket: "trackrepost-921f8.firebasestorage.app",
  messagingSenderId: "967836604288",
  appId: "1:967836604288:web:3782d50de7384c9201d365",
  measurementId: "G-G65Q3HC3R8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
=======
    apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw",
    authDomain: "trackrepost-921f8.firebaseapp.com",
    projectId: "trackrepost-921f8",
    storageBucket: "gs://trackrepost-921f8.firebasestorage.app",
    messagingSenderId:
 "967836604288",
    appId: "1:967836604288:web:3782d50de7384c9201d365"
>>>>>>> 14fc7da5e42b0a8654837c5695ba4aecb728ea31
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Signup Function
export function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
}

// Login Function
export function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

// Logout Function
export function logout() {
    return signOut(auth);
}

// Submit Track Function (Free Users Limited to 1 Track)
export async function submitTrack() {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to submit a track.");
        return;
    }

    const soundcloudUrl = document.getElementById("soundcloudUrl").value;
    if (!soundcloudUrl) {
        alert("Please enter a valid SoundCloud URL.");
        return;
    }

    const userTrackRef = doc(db, "users", user.uid);
    const userTrackSnap = await getDoc(userTrackRef);

    if (userTrackSnap.exists() && userTrackSnap.data().track) {
        alert("Free users can only submit one track. Upgrade to submit more.");
        return;
    }

    await setDoc(userTrackRef, { track: soundcloudUrl }, { merge: true });

    document.getElementById("currentTrackMessage").innerText = "Your current track: " + soundcloudUrl;
    alert("SoundCloud track submitted successfully!");
<<<<<<< HEAD
}
=======
}
>>>>>>> 14fc7da5e42b0a8654837c5695ba4aecb728ea31
