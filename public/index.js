// ✅ Ensure Firebase is loaded before running scripts
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check index.html script imports.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Initialize Firebase Authentication and Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Firebase Auth State Listener
auth.onAuthStateChanged(user => {
    if (user) {
        console.log(`✅ User logged in: ${user.email}`);
        updateDashboard(user);
        document.getElementById("logoutBtn").style.display = "inline-block";
    } else {
        console.warn("🚨 No user is logged in.");
        updateDashboard(null);
        document.getElementById("logoutBtn").style.display = "none";
    }
});

// ✅ Attach Event Listeners (Ensure Buttons are Clickable)
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Page Loaded Successfully!");

    // ✅ Ensure elements exist before adding event listeners
    if (document.getElementById("signupBtn")) {
        document.getElementById("signupBtn").addEventListener("click", signupUser);
    }
    if (document.getElementById("loginBtn")) {
        document.getElementById("loginBtn").addEventListener("click", loginUser);
    }
    if (document.getElementById("logoutBtn")) {
        document.getElementById("logoutBtn").addEventListener("click", logoutUser);
    }

    loadActiveCampaigns(); // ✅ Load campaigns on page load
});

// ✅ Fix Functions
function signupUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            console.log(`✅ User signed up: ${userCredential.user.email}`);
            updateDashboard(userCredential.user);
        })
        .catch(error => {
            console.error("❌ Signup Error:", error);
            alert(`Signup Error: ${error.message}`);
        });
}

function loginUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            console.log(`✅ User logged in: ${userCredential.user.email}`);
            updateDashboard(userCredential.user);
        })
        .catch(error => {
            console.error("❌ Login Error:", error);
            alert(`Login Error: ${error.message}`);
        });
}

function logoutUser() {
    auth.signOut()
        .then(() => {
            console.log("✅ User logged out successfully.");
            updateDashboard(null);
        })
        .catch(error => {
            console.error("❌ Logout Error:", error);
        });
}
