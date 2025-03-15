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
auth.onAuthStateChanged(user => {
    if (user) {
        console.log(`✅ User logged in: ${user.email}`);
        updateDashboard(user);
        loadActiveCampaigns(); // Reload campaigns after login
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

    dashboard.innerHTML = `<h2>Welcome, ${user.email}!</h2>`;
}

// ✅ Sign Up a New User
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

// ✅ Log In an Existing User
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

// ✅ Log Out the Current User
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
window.loadActiveCampaigns = function () {
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

                    // Calculate credits based on followers
                    let userCredits = 1; // Default (for 100 followers)
                    if (data.followers >= 1000) {
                        userCredits = 10;
                    } else if (data.followers >= 500) {
                        userCredits = 5;
                    } else if (data.followers >= 100) {
                        userCredits = 1;
                    }

                    campaignsDiv.innerHTML += `
                        <div class="campaign">
                            <h3>🔥 Now Promoting:</h3>
                            <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                            </iframe>
                            <button onclick="repostTrack('${doc.id}', '${data.owner}', '${userCredits}')">
                                Repost & Earn ${userCredits} Credits
                            </button>
                        </div>
                    `;
                });
            }
        })
        .catch(error => {
            console.error("❌ Error loading active campaigns:", error);
        });
};

// ✅ Initialize SoundCloud Widget API for Reposting
window.repostTrack = function (campaignId, ownerId, credits) {
    console.log(`🔄 Attempting to repost campaign ${campaignId}`);

    // Find the iframe for this campaign
    let iframe = document.querySelector(`iframe[src*="${campaignId}"]`);
    if (!iframe) {
        console.error("❌ SoundCloud widget not found.");
        alert("❌ Error: SoundCloud widget not found.");
        return;
    }

    // Get SoundCloud Widget API for this iframe
    let widget = SC.Widget(iframe);

    // Play the track and wait for repost event
    widget.play();

    widget.bind(SC.Widget.Events.PLAY, function () {
        console.log("✅ Track started playing.");
    });

    widget.bind(SC.Widget.Events.FINISH, function () {
        console.log("✅ Track finished playing.");
    });

    widget.bind(SC.Widget.Events.CLICK_SHARE, function () {
        console.log(`✅ User reposted the track! Awarding ${credits} credits.`);
        alert(`✅ You reposted the track! You earned ${credits} credits.`);

        // Add credits to user in Firestore
        const user = auth.currentUser;
        if (user) {
            db.collection("users").doc(user.uid).update({
                credits: firebase.firestore.FieldValue.increment(credits)
            }).then(() => {
                console.log(`✅ Updated credits for user: ${user.email}`);
            }).catch(error => {
                console.error("❌ Error updating credits:", error);
            });
        }
    });
};

// ✅ Post a Comment & Earn Credits
window.postComment = function () {
    const commentText = document.getElementById("commentText").value.trim();
    if (commentText === "") {
        alert("❌ You must enter a comment.");
        return;
    }

    // Redirect user to SoundCloud (they must manually post the comment)
    alert("🔄 Redirecting to SoundCloud. Please post your comment there to earn credits.");
    window.open("https://soundcloud.com", "_blank");

    // Add credits to user for commenting
    const user = auth.currentUser;
    if (user) {
        db.collection("users").doc(user.uid).update({
            credits: firebase.firestore.FieldValue.increment(2)
        }).then(() => {
            console.log(`✅ Comment posted! 2 credits added to ${user.email}`);
            alert("✅ You earned 2 credits for commenting!");
        }).catch(error => {
            console.error("❌ Error updating credits:", error);
        });
    }
};

// ✅ Ensure Page Loads & Functions are Attached
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Page Loaded Successfully!");
    loadActiveCampaigns();

    // ✅ Attach Event Listeners to Buttons
    document.getElementById("signupBtn").addEventListener("click", signupUser);
    document.getElementById("loginBtn").addEventListener("click", loginUser);
    document.getElementById("logoutBtn").addEventListener("click", logoutUser);
    document.getElementById("postCommentBtn").addEventListener("click", postComment);
});
