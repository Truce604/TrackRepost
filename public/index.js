// ✅ Ensure Firebase is loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check index.html script imports.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Firebase Authentication and Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Listen for Authentication State Changes
auth.onAuthStateChanged(user => {
    if (user) {
        console.log(`✅ User logged in: ${user.email}`);
        updateDashboard(user);
        loadActiveCampaigns();
        getUserCredits(user.uid);
    } else {
        console.warn("🚨 No user is logged in.");
        updateDashboard(null);
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

    dashboard.innerHTML = `<h2>Welcome, ${user.email}!</h2><p>Credits: <span id="userCredits">Loading...</span></p>`;
}

// ✅ Fetch User's Credits
function getUserCredits(userId) {
    db.collection("users").doc(userId).get().then(doc => {
        if (doc.exists) {
            const credits = doc.data().credits || 0;
            document.getElementById("userCredits").innerText = credits;
            console.log(`💰 User has ${credits} credits`);
        } else {
            console.warn("🚨 User document not found.");
        }
    }).catch(error => {
        console.error("❌ Error fetching user credits:", error);
    });
}

// ✅ Load Active Campaigns
function loadActiveCampaigns() {
    console.log("🔄 Loading campaigns...");

    const campaignsDiv = document.getElementById("activeCampaigns");
    if (!campaignsDiv) {
        console.error("❌ Campaigns section not found.");
        return;
    }

    db.collection("campaigns").get().then(querySnapshot => {
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
    }).catch(error => {
        console.error("❌ Error loading active campaigns:", error);
    });
}

// ✅ Repost a Track
function repostTrack(campaignId, ownerId, credits) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to repost.");
        return;
    }

    db.collection("reposts").doc(`${campaignId}_${user.uid}`).get().then(doc => {
        if (doc.exists) {
            alert("🚨 You have already reposted this track.");
        } else {
            // Create repost entry
            db.collection("reposts").doc(`${campaignId}_${user.uid}`).set({
                userId: user.uid,
                campaignId: campaignId,
                creditsEarned: credits,
                timestamp: new Date()
            }).then(() => {
                console.log("✅ Repost recorded.");

                // Update user's credits
                db.collection("users").doc(user.uid).update({
                    credits: firebase.firestore.FieldValue.increment(credits)
                }).then(() => {
                    alert(`✅ Reposted! You earned ${credits} credits.`);
                    getUserCredits(user.uid);
                }).catch(error => {
                    console.error("❌ Error updating credits:", error);
                });
            }).catch(error => {
                console.error("❌ Error recording repost:", error);
            });
        }
    }).catch(error => {
        console.error("❌ Error checking repost status:", error);
    });
}

// ✅ Submit a New Track
function submitTrack() {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to submit a track.");
        return;
    }

    const soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();
    if (!soundcloudUrl.includes("soundcloud.com/")) {
        alert("🚨 Invalid SoundCloud URL.");
        return;
    }

    db.collection("campaigns").add({
        owner: user.uid,
        track: soundcloudUrl,
        credits: 10,
        timestamp: new Date()
    }).then(() => {
        alert("✅ Track successfully submitted!");
        loadActiveCampaigns();
    }).catch(error => {
        console.error("❌ Error submitting track:", error);
        alert(`Error submitting track: ${error.message}`);
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

// ✅ Sign Up User
function signupUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            console.log(`✅ User signed up: ${userCredential.user.email}`);
            updateDashboard(userCredential.user);
            db.collection("users").doc(userCredential.user.uid).set({ credits: 0 });
        })
        .catch(error => {
            console.error("❌ Signup Error:", error);
            alert(`Signup Error: ${error.message}`);
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

// ✅ SoundCloud Login
function loginWithSoundCloud() {
    alert("🔊 Redirecting to SoundCloud login...");
    window.location.href = "https://soundcloud.com/connect"; // Replace with OAuth if available
}

// ✅ Ensure Page Loads & Functions Attach
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Page Loaded Successfully!");
    loadActiveCampaigns();

    document.getElementById("signupBtn").addEventListener("click", signupUser);
    document.getElementById("loginBtn").addEventListener("click", loginUser);
    document.getElementById("logoutBtn").addEventListener("click", logoutUser);
});


