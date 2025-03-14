import firebaseConfig from './firebaseConfig.js';

// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check index.html script imports.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Initialize Firebase (Only Once)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
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

// ✅ LOGIN FUNCTION
window.loginUser = function () {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        alert("🚨 Please enter both email and password.");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            console.log("✅ Login Successful!");
            document.getElementById("authMessage").textContent = "✅ Login Successful!";
            updateDashboard(userCredential.user);
        })
        .catch(error => {
            console.error("❌ Login Error:", error);
            alert(`❌ Login Error: ${error.message}`);
        });
};

// ✅ SIGNUP FUNCTION
window.signupUser = function () {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        alert("🚨 Please enter both email and password.");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            return db.collection("users").doc(userCredential.user.uid).set({
                email: userCredential.user.email,
                credits: 10,
                reposts: 0
            });
        })
        .then(() => {
            console.log("✅ Signup Successful!");
            document.getElementById("authMessage").textContent = "✅ Signup Successful!";
            updateDashboard(auth.currentUser);
        })
        .catch(error => {
            console.error("❌ Signup Error:", error);
            alert(`❌ Signup Error: ${error.message}`);
        });
};

// ✅ LOGOUT FUNCTION
window.logoutUser = function () {
    auth.signOut().then(() => {
        console.log("✅ Logged out successfully!");
        document.getElementById("authMessage").textContent = "✅ Logged out successfully!";
        updateDashboard(null);
    }).catch(error => {
        console.error("❌ Logout Error:", error);
        alert(`❌ Logout Error: ${error.message}`);
    });
};

// ✅ FUNCTION: Update User Dashboard
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
            console.warn("⚠️ No user data found.");
        }
    });
};

// ✅ FUNCTION: Load Active Campaigns
window.loadActiveCampaigns = function () {
    console.log("🔄 Loading campaigns...");
    const campaignsDiv = document.getElementById("activeCampaigns");

    if (!campaignsDiv) {
        console.error("❌ Campaigns section not found.");
        return;
    }

    campaignsDiv.innerHTML = "<p>⏳ Loading campaigns...</p>";

    db.collection("campaigns").orderBy("timestamp", "desc").onSnapshot(snapshot => {
        campaignsDiv.innerHTML = "";

        if (snapshot.empty) {
            campaignsDiv.innerHTML = "<p>No active campaigns available.</p>";
        } else {
            snapshot.forEach(doc => {
                let data = doc.data();
                campaignsDiv.innerHTML += `
                    <div id="campaign-${doc.id}" class="campaign">
                        <h3>🔥 Now Promoting:</h3>
                        <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                            src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                        </iframe>
                        <button onclick="repostTrack('${doc.id}', '${data.owner}', '${data.credits}')">Repost & Earn Credits</button>
                    </div>
                `;
            });
        }
    });
};

// ✅ Ensure Campaigns Load on Page Load
document.addEventListener("DOMContentLoaded", () => {
    loadActiveCampaigns();
});


