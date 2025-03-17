// ✅ Ensure Firebase is loaded before running scripts
if (!window.auth || !window.db) {
    console.error("🚨 Firebase is not properly initialized! Check firebaseConfig.js.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Use Global Firebase References from `firebaseConfig.js`
const auth = window.auth;
const db = window.db;

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
        dashboard.innerHTML = `
            <h2>You are not logged in.</h2>
            <p>Please log in or sign up.</p>
        `;
        return;
    }

    dashboard.innerHTML = `
        <h2>Welcome, ${user.email}!</h2>
        <p><strong>Your Credits:</strong> <span id="userCredits">Loading...</span></p>
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
                document.querySelector("#userCredits").textContent = credits;
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
            location.reload(); // ✅ Refresh page to apply changes
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
            location.reload(); // ✅ Refresh page to apply changes
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
            location.reload(); // ✅ Refresh page to ensure user is fully logged out
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
                    campaignsDiv.innerHTML += `
                        <div class="campaign">
                            <h3>🔥 Now Promoting:</h3>
                            <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                            </iframe>
                            <button onclick="repostTrack('${doc.id}', '${data.owner}', ${data.credits})">
                                Repost & Earn ${data.credits} Credits
                            </button>
                        </div>
                    `;
                });
            }
        })
        .catch(error => {
            console.error("❌ Error loading active campaigns:", error);
        });
}

// ✅ Function to Handle Reposting a Track
function repostTrack(campaignId, ownerId, credits) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to repost.");
        return;
    }

    console.log(`🔄 Reposting campaign: ${campaignId} | Owner: ${ownerId} | Credits: ${credits}`);

    // ✅ Deduct credits from user
    const userRef = db.collection("users").doc(user.uid);
    userRef.get()
        .then(doc => {
            if (!doc.exists) {
                console.error("❌ User document not found.");
                return;
            }

            let userCredits = doc.data().credits || 0;

            if (userCredits < credits) {
                alert("🚨 Not enough credits to repost!");
                return;
            }

            // ✅ Deduct credits and update Firestore
            userCredits -= credits;
            userRef.update({ credits: userCredits })
                .then(() => {
                    console.log(`✅ Credits updated. New balance: ${userCredits}`);
                    document.getElementById("userCredits").textContent = userCredits;

                    // ✅ Add repost record
                    db.collection("reposts").add({
                        userId: user.uid,
                        campaignId: campaignId,
                        timestamp: new Date()
                    }).then(() => {
                        alert("✅ Track successfully reposted!");
                    }).catch(error => console.error("❌ Error saving repost record:", error));
                })
                .catch(error => console.error("❌ Error updating credits:", error));
        })
        .catch(error => console.error("❌ Error fetching user data:", error));
}

// ✅ Attach Event Listeners to Buttons
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Page Loaded Successfully!");
    loadActiveCampaigns();

    document.getElementById("signupBtn").addEventListener("click", signupUser);
    document.getElementById("loginBtn").addEventListener("click", loginUser);
    document.getElementById("logoutBtn").addEventListener("click", logoutUser);
});
