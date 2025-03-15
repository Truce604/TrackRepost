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
        
        // Load user credits
        const userRef = db.collection("users").doc(user.uid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            document.getElementById("userCredits").innerText = `💰 ${userDoc.data().credits} Credits`;
        }

        // Load active campaigns
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
            alert("✅ Signup Successful!");
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
            alert("✅ Login Successful!");
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
            alert("✅ Logout Successful!");
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
                            <button onclick="repostTrack('${doc.id}', '${data.owner}', '${data.credits}')">
                                Repost & Earn ${data.credits} Credits
                            </button>
                            <button onclick="likeTrack('${doc.id}')">❤ Like & Earn 1 Credit</button>
                            <button onclick="commentTrack('${doc.id}')">💬 Comment & Earn 2 Credits</button>
                        </div>
                    `;
                });
            }
        })
        .catch(error => {
            console.error("❌ Error loading active campaigns:", error);
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
        credits: 10, // Default 10 credits per campaign
        timestamp: new Date()
    }).then(() => {
        alert("✅ Track successfully submitted!");
        loadActiveCampaigns();
    }).catch(error => {
        console.error("❌ Error submitting track:", error);
        alert(`Error submitting track: ${error.message}`);
    });
}

// ✅ Repost a Track (Redirect to SoundCloud)
function repostTrack(campaignId, ownerId, credits) {
    alert(`🚨 You must be signed into SoundCloud to repost this track.`);
    console.log(`Attempting to repost campaign ${campaignId}`);
    
    // Redirect to SoundCloud repost page
    window.open(`https://soundcloud.com/you/tracks/${campaignId}`, "_blank");
}

// ✅ Like a Track
function likeTrack(campaignId) {
    alert(`🚨 You must be signed into SoundCloud to like this track.`);
    console.log(`Attempting to like campaign ${campaignId}`);
    
    // Redirect to SoundCloud like page
    window.open(`https://soundcloud.com/you/likes/${campaignId}`, "_blank");
}

// ✅ Comment on a Track
function commentTrack(campaignId) {
    alert(`🚨 You must be signed into SoundCloud to comment.`);
    console.log(`Attempting to comment on campaign ${campaignId}`);

    // Redirect to SoundCloud comment section
    window.open(`https://soundcloud.com/you/comments/${campaignId}`, "_blank");
}

// ✅ SoundCloud Authentication (Placeholder)
function loginWithSoundCloud() {
    alert("🔊 Redirecting to SoundCloud login...");
    window.location.href = "https://soundcloud.com/connect"; // Replace with actual OAuth login when implemented
}

// ✅ Ensure Page Loads & Functions are Attached
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Page Loaded Successfully!");
    loadActiveCampaigns();

    // ✅ Attach Event Listeners to Buttons
    document.getElementById("signupBtn").addEventListener("click", signupUser);
    document.getElementById("loginBtn").addEventListener("click", loginUser);
    document.getElementById("logoutBtn").addEventListener("click", logoutUser);
    document.getElementById("submitTrackBtn").addEventListener("click", submitTrack);
    document.getElementById("soundcloudLoginBtn").addEventListener("click", loginWithSoundCloud);
});
