
// ✅ Firebase is already initialized in firebaseConfig.js
console.log("✅ Firebase Loaded Successfully!");
console.log(`🟢 Square Application ID: ${SQUARE_APPLICATION_ID}`);
console.log(`🟢 Square Location ID: ${SQUARE_LOCATION_ID}`);

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

// ✅ Function to load user's credits from Firestore
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

// ✅ Log In User
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

// ✅ Load Active Campaigns from Firestore
function loadActiveCampaigns() {
    console.log("🔄 Loading campaigns...");

    const campaignsDiv = document.getElementById("activeCampaigns");
    if (!campaignsDiv) {
        console.error("❌ Campaigns section not found.");
        return;
    }

    db.collection("campaigns").get()
        .then(querySnapshot => {
            campaignsDiv.innerHTML = "";

            if (querySnapshot.empty) {
                campaignsDiv.innerHTML = "<p>No active campaigns available.</p>";
            } else {
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    const repostUrl = `repost.html?id=${doc.id}&track=${encodeURIComponent(data.track)}&owner=${data.owner}&credits=${data.credits}`;

                    campaignsDiv.innerHTML += `
                        <div class="campaign">
                            <h3>🔥 Now Promoting:</h3>
                            <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                            </iframe>
                            <a href="${repostUrl}">
                                <button>Repost & Earn ${data.credits} Credits</button>
                            </a>
                        </div>
                    `;
                });
            }
        })
        .catch(error => {
            console.error("❌ Error loading active campaigns:", error);
        });
}

// ✅ Attach Event Listeners to Buttons
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Page Loaded Successfully!");
    loadActiveCampaigns();

    document.getElementById("signupBtn")?.addEventListener("click", signupUser);
    document.getElementById("loginBtn")?.addEventListener("click", loginUser);
    document.getElementById("logoutBtn")?.addEventListener("click", logoutUser);
});


