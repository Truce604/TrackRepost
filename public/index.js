
// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check index.html script imports.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Initialize Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Firebase Auth State Listener (Checks if user is logged in)
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

// ✅ Update User Dashboard
function updateDashboard(user) {
    const dashboard = document.getElementById("userDashboard");
    if (!dashboard) {
        console.error("❌ Dashboard element not found.");
        return;
    }

    if (!user) {
        dashboard.innerHTML = `<h2>You are not logged in.</h2><p>Please log in or sign up.</p>`;
        return;
    }

    dashboard.innerHTML = `
        <h2>Welcome, ${user.email}!</h2>
        <p><strong>Your Credits:</strong> Loading...</p>
        <a href="subscribe.html">
            <button>💳 Buy Credits</button>
        </a>
    `;

    // ✅ Load user's credits
    loadUserCredits(user.uid);
}

// ✅ Function to Load User's Credits from Firestore
function loadUserCredits(userId) {
    db.collection("users").doc(userId).get()
        .then(doc => {
            if (doc.exists) {
                const credits = doc.data().credits || 0;
                document.querySelector("#userDashboard p").innerHTML = `<strong>Your Credits:</strong> ${credits}`;
                console.log(`✅ User credits loaded: ${credits}`);
            } else {
                console.warn("🚨 User document not found.");
            }
        })
        .catch(error => {
            console.error("❌ Error loading user credits:", error);
        });
}

// ✅ Sign Up User
function signupUser() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        alert("🚨 Please enter an email and password.");
        return;
    }

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

// ✅ Log In User
function loginUser() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        alert("🚨 Please enter an email and password.");
        return;
    }

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

// ✅ Log Out User
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

// ✅ Ensure Page Loads & Attach Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Page Loaded Successfully!");
    loadActiveCampaigns();

    document.getElementById("signupBtn").addEventListener("click", signupUser);
    document.getElementById("loginBtn").addEventListener("click", loginUser);
    document.getElementById("logoutBtn").addEventListener("click", logoutUser);
});

