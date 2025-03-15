// ✅ Ensure Firebase is loaded before running scripts 
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check index.html script imports.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Firebase Authentication and Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Firebase Auth State Listener (Checks if user is logged in)
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log(`✅ User logged in: ${user.email}`);
        document.getElementById("logoutBtn").style.display = "block";
        document.getElementById("authMessage").innerText = `✅ Logged in as ${user.email}`;
        
        // Load credits
        const userRef = db.collection("users").doc(user.uid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            document.getElementById("userCredits").innerText = `💰 ${userDoc.data().credits} Credits`;
        }

        // Load campaigns
        loadActiveCampaigns();
    } else {
        console.warn("🚨 No user is logged in.");
        document.getElementById("authMessage").innerText = "❌ Not logged in";
        document.getElementById("logoutBtn").style.display = "none";
    }
});

// ✅ Sign Up a New User
function signupUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            console.log(`✅ User signed up: ${userCredential.user.email}`);
            window.location.reload();
        })
        .catch(error => {
            console.error("❌ Signup Error:", error);
            alert(`Signup Error: ${error.message}`);
        });
}

// ✅ Log In an Existing User
function loginUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            console.log(`✅ User logged in: ${userCredential.user.email}`);
            window.location.reload();
        })
        .catch(error => {
            console.error("❌ Login Error:", error);
            alert(`Login Error: ${error.message}`);
        });
}

// ✅ Log Out the Current User
function logoutUser() {
    auth.signOut()
        .then(() => {
            console.log("✅ User logged out successfully.");
            window.location.reload();
        })
        .catch(error => {
            console.error("❌ Logout Error:", error);
        });
}

// ✅ Attach Event Listeners **AFTER** defining functions
document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ Page Loaded Successfully!");

    // Ensure functions exist before attaching event listeners
    document.getElementById("signupBtn").addEventListener("click", signupUser);
    document.getElementById("loginBtn").addEventListener("click", loginUser);
    document.getElementById("logoutBtn").addEventListener("click", logoutUser);
});
