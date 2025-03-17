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
        dashboard.innerHTML = `<h2>You are not logged in.</h2><p>Please log in or sign up.</p>`;
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

// ✅ Load Active Campaigns from Firestore (Fixing Repost Credits)
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
                    let calculatedCredits = Math.max(1, Math.floor((data.followerCount || 0) / 100)); // Ensures at least 1 credit

                    campaignsDiv.innerHTML += `
                        <div class="campaign">
                            <h3>🔥 Now Promoting:</h3>
                            <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                            </iframe>
                            <button onclick="repostTrack('${doc.id}', '${data.owner}', ${calculatedCredits})">
                                Repost & Earn ${calculatedCredits} Credits
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

// ✅ Function to Repost a Track
function repostTrack(campaignId, ownerId, credits) {
    console.log(`🔄 Attempting to repost campaign ${campaignId}`);

    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to repost.");
        return;
    }

    // ✅ Update user's credits
    const userRef = db.collection("users").doc(user.uid);
    db.runTransaction(transaction => {
        return transaction.get(userRef).then(doc => {
            if (!doc.exists) throw "🚨 User does not exist!";

            let currentCredits = doc.data().credits || 0;
            let newCredits = currentCredits + credits;

            transaction.update(userRef, { credits: newCredits });
        });
    }).then(() => {
        console.log(`✅ Credits updated! User earned ${credits} credits.`);
        loadUserCredits(user.uid); // ✅ Refresh displayed credits
        alert(`✅ Repost successful! You earned ${credits} credits.`);
    }).catch(error => {
        console.error("❌ Error updating credits:", error);
    });
}

// ✅ Attach Event Listeners to Buttons
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Page Loaded Successfully!");
    loadActiveCampaigns();

    document.getElementById("signupBtn").addEventListener("click", signupUser);
    document.getElementById("loginBtn").addEventListener("click", loginUser);
    document.getElementById("logoutBtn").addEventListener("click", logoutUser);
});
