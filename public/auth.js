
// ✅ Initialize Firebase (Only Declare Once)
if (!firebase.apps.length) {
    firebase.initializeApp({
        apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw",
        authDomain: "trackrepost-921f8.firebaseapp.com",
        projectId: "trackrepost-921f8",
        storageBucket: "trackrepost-921f8.appspot.com",
        messagingSenderId: "967836604288",
        appId: "1:967836604288:web:3782d50de7384c9201d365",
        measurementId: "G-G65Q3HC3R8"
    });
    console.log("✅ Firebase Initialized Successfully!");
}


// ✅ Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Listen for Auth Changes
auth.onAuthStateChanged(user => {
    if (user) {
        console.log(`✅ User logged in: ${user.email}`);
        document.getElementById("logoutBtn").style.display = "block";
        updateDashboard(user);
        loadActiveCampaigns();
    } else {
        console.warn("🚨 No user detected.");
        document.getElementById("logoutBtn").style.display = "none";
        updateDashboard(null);
    }
});

// ✅ FUNCTION: LOGIN USER
window.loginUser = function () {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        alert("🚨 Please enter both email and password.");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            document.getElementById("authMessage").textContent = "✅ Login Successful!";
            updateDashboard(userCredential.user);
        })
        .catch(error => {
            console.error("❌ Login Error:", error);
            document.getElementById("authMessage").textContent = `❌ Login Error: ${error.message}`;
        });
};

// ✅ FUNCTION: SIGNUP USER
window.signupUser = function () {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        alert("🚨 Please enter an email and password.");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            return db.collection("users").doc(userCredential.user.uid).set({
                email: userCredential.user.email,
                credits: 10, // Default credits for new users
                followers: 100, // Default followers for testing
                reposts: 0
            });
        })
        .then(() => {
            document.getElementById("authMessage").textContent = "✅ Signup Successful!";
            updateDashboard(auth.currentUser);
        })
        .catch(error => {
            console.error("❌ Signup Error:", error);
            document.getElementById("authMessage").textContent = `❌ Signup Error: ${error.message}`;
        });
};

// ✅ FUNCTION: LOGOUT USER
window.logoutUser = function () {
    auth.signOut().then(() => {
        document.getElementById("authMessage").textContent = "✅ Logged out successfully!";
        updateDashboard(null);
    }).catch(error => {
        console.error("❌ Logout Error:", error);
        document.getElementById("authMessage").textContent = `❌ Logout Error: ${error.message}`;
    });
};

// ✅ FUNCTION: UPDATE DASHBOARD
window.updateDashboard = function (user) {
    const dashboard = document.getElementById("userDashboard");

    if (!dashboard) {
        console.error("❌ Dashboard element not found.");
        return;
    }

    if (!user) {
        dashboard.innerHTML = `<h2>You are not logged in.</h2><p>Please log in or sign up.</p>`;
        return;
    }

    db.collection("users").doc(user.uid).onSnapshot(doc => {
        if (doc.exists) {
            let data = doc.data();
            dashboard.innerHTML = `
                <h2>Welcome, ${user.email}!</h2>
                <p>Reposts: <span id="repostCount">${data.reposts || 0}</span></p>
                <p>Credits: <span id="creditCount">${data.credits || 0}</span></p>
            `;
        } else {
            console.warn("⚠️ No user data found in Firestore.");
        }
    });
};

// ✅ AUTOLOAD CAMPAIGNS ON PAGE LOAD
document.addEventListener("DOMContentLoaded", () => {
    loadActiveCampaigns();
});


