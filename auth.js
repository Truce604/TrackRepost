// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw",
    authDomain: "trackrepost-921f8.firebaseapp.com",
    projectId: "trackrepost-921f8",
    storageBucket: "trackrepost-921f8.appspot.com",
    messagingSenderId: "967836604288",
    appId: "1:967836604288:web:3782d50de7384c9201d365"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ SIGN UP FUNCTION
window.signupUser = function() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            alert("Signup Successful! Welcome " + userCredential.user.email);
        })
        .catch((error) => {
            alert("Signup Error: " + error.message);
            console.error("Signup Error:", error);
        });
};

// ✅ LOGIN FUNCTION
window.loginUser = function() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            alert("Login Successful! Welcome " + userCredential.user.email);
        })
        .catch((error) => {
            alert("Login Error: " + error.message);
            console.error("Login Error:", error);
        });
};

// ✅ LOGOUT FUNCTION
window.logoutUser = function() {
    auth.signOut()
        .then(() => {
            alert("Logged Out!");
        })
        .catch((error) => {
            alert("Logout Error: " + error.message);
            console.error("Logout Error:", error);
        });
};

// ✅ SUBMIT TRACK FUNCTION (Only 1 Track for Free Users)
window.submitTrack = async function() {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to submit a track.");
        return;
    }

    const soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();
    if (!soundcloudUrl) {
        alert("Please enter a valid SoundCloud URL.");
        return;
    }

    const userTrackRef = db.collection("users").doc(user.uid);
    
    try {
        const userTrackSnap = await userTrackRef.get();

        if (userTrackSnap.exists && userTrackSnap.data().track) {
            alert("Free users can only submit one track. Upgrade to submit more.");
            return;
        }

        await userTrackRef.set({ track: soundcloudUrl }, { merge: true });

        document.getElementById("currentTrackMessage").innerText = "Your current track: " + soundcloudUrl;
        alert("SoundCloud track submitted successfully!");
    } catch (error) {
        console.error("Error submitting track:", error);
        alert("An error occurred while submitting your track. Please try again.");
    }
};
