
// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Initialize Firebase (Only Declare Once)
if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
    console.log("✅ Firebase Initialized Successfully!");
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
                reposts: 0,
                followers: 1000 // Default value for testing
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

// ✅ FUNCTION: SUBMIT A NEW TRACK
window.submitTrack = function () {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to submit a track.");
        return;
    }

    let soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();
    if (!soundcloudUrl.includes("soundcloud.com/")) {
        alert("🚨 Invalid SoundCloud URL.");
        return;
    }

    db.collection("campaigns").add({
        owner: user.uid,
        track: soundcloudUrl,
        credits: 10, 
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("✅ Track successfully submitted!");
        loadActiveCampaigns();
    }).catch(error => {
        console.error("❌ Error submitting track:", error);
        alert("❌ Error submitting track: " + error.message);
    });
};

// ✅ FUNCTION: LOAD ACTIVE CAMPAIGNS
window.loadActiveCampaigns = function () {
    const campaignsDiv = document.getElementById("activeCampaigns");
    if (!campaignsDiv) {
        console.error("❌ Campaigns section not found");
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

// ✅ FUNCTION: REPOST A TRACK & EARN CREDITS
window.repostTrack = async function (campaignId, ownerId, credits) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to repost.");
        return;
    }

    try {
        const userRef = db.collection("users").doc(user.uid);
        const campaignRef = db.collection("campaigns").doc(campaignId);
        const repostRef = db.collection("reposts").doc(`${campaignId}_${user.uid}`);

        // ✅ Check if user already reposted
        const repostDoc = await repostRef.get();
        if (repostDoc.exists) {
            alert("🚨 You have already reposted this track.");
            return;
        }

        // ✅ Get User Data for Followers Count
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            alert("🚨 User data not found.");
            return;
        }
        const userData = userDoc.data();
        let followers = userData.followers || 1000; // Default if missing
        let earnedCredits = Math.floor(followers / 1000) * 10; // 1000 followers = 10 credits

        // ✅ Update Firestore
        await db.runTransaction(async (transaction) => {
            transaction.set(repostRef, {
                userId: user.uid,
                campaignId: campaignId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            transaction.update(userRef, {
                credits: firebase.firestore.FieldValue.increment(earnedCredits)
            });

            transaction.update(campaignRef, {
                credits: firebase.firestore.FieldValue.increment(-earnedCredits)
            });
        });

        alert(`✅ Repost Successful! You earned ${earnedCredits} credits.`);
    } catch (error) {
        console.error("❌ Error reposting:", error);
        alert(`❌ Error: ${error.message}`);
    }
};

// ✅ AUTOLOAD CAMPAIGNS ON PAGE LOAD
document.addEventListener("DOMContentLoaded", () => {
    loadActiveCampaigns();
});
