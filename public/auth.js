// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();

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
            console.warn("⚠️ No user data found.");
        }
    });
};

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
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

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

// ✅ SIGNUP FUNCTION
window.signupUser = function () {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            return db.collection("users").doc(userCredential.user.uid).set({
                email: userCredential.user.email,
                credits: 10,
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

// ✅ LOGOUT FUNCTION
window.logoutUser = function () {
    auth.signOut().then(() => {
        document.getElementById("authMessage").textContent = "✅ Logged out successfully!";
        updateDashboard(null);
    }).catch(error => {
        console.error("❌ Logout Error:", error);
        document.getElementById("authMessage").textContent = `❌ Logout Error: ${error.message}`;
    });
};

// ✅ FUNCTION: LOAD ACTIVE CAMPAIGNS
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
                    <div class="campaign">
                        <h3>🔥 Now Promoting:</h3>
                        <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                            src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                        </iframe>
                        <button onclick="repostTrack('${doc.id}', '${data.owner}', '${data.track}')">🔄 Repost & Earn Credits</button>
                        <button onclick="likeTrack('${data.track}')">❤️ Like Track</button>
                        <button onclick="followUser('${data.owner}')">🔔 Follow Artist</button>
                    </div>
                `;
            });
        }
    });
};

// ✅ FUNCTION: LOGIN WITH SOUNDCLOUD
window.loginWithSoundCloud = function () {
    SC.initialize({
        client_id: "YOUR_SOUNDCLOUD_CLIENT_ID",
        redirect_uri: "YOUR_REDIRECT_URI"
    });

    SC.connect().then(function () {
        return SC.get('/me');
    }).then(function (me) {
        alert(`✅ SoundCloud Connected: ${me.username}`);
        console.log(`✅ Logged in as: ${me.username}`);
    }).catch(function (error) {
        console.error("❌ SoundCloud Login Error:", error);
        alert("🚨 Failed to connect to SoundCloud.");
    });
};

// ✅ FUNCTION: REPOST TRACK
window.repostTrack = function (campaignId, ownerId, trackUrl) {
    SC.connect().then(() => {
        return SC.put(`/e1/me/track_reposts/${trackUrl}`);
    }).then(() => {
        alert("✅ Track Reposted Successfully!");
        console.log("✅ Track reposted:", trackUrl);
    }).catch(error => {
        console.error("❌ Repost Error:", error);
        alert("🚨 Failed to repost the track.");
    });
};

// ✅ FUNCTION: LIKE TRACK
window.likeTrack = function (trackUrl) {
    SC.connect().then(() => {
        return SC.put(`/e1/me/track_likes/${trackUrl}`);
    }).then(() => {
        alert("✅ Track Liked Successfully!");
        console.log("✅ Track liked:", trackUrl);
    }).catch(error => {
        console.error("❌ Like Error:", error);
        alert("🚨 Failed to like the track.");
    });
};

// ✅ FUNCTION: FOLLOW ARTIST
window.followUser = function (ownerId) {
    SC.connect().then(() => {
        return SC.put(`/e1/me/followings/${ownerId}`);
    }).then(() => {
        alert("✅ Artist Followed Successfully!");
        console.log("✅ Followed artist:", ownerId);
    }).catch(error => {
        console.error("❌ Follow Error:", error);
        alert("🚨 Failed to follow the artist.");
    });
};

// ✅ AUTOLOAD CAMPAIGNS ON PAGE LOAD
document.addEventListener("DOMContentLoaded", () => {
    if (typeof loadActiveCampaigns === "function") {
        loadActiveCampaigns();
    } else {
        console.error("🚨 loadActiveCampaigns function is missing!");
    }
});


