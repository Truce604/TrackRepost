
// ✅ Ensure Firebase is Loaded
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

// ✅ FUNCTION: UPDATE DASHBOARD
function updateDashboard(user) {
    const dashboard = document.getElementById("userDashboard");

    if (!dashboard) {
        console.error("❌ Dashboard element not found in the DOM.");
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
}

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
                followers: 1000 // Default follower count for calculations
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
        alert("🚨 Invalid SoundCloud URL. Make sure it's a valid SoundCloud link.");
        return;
    }

    db.collection("campaigns").add({
        owner: user.uid,
        track: soundcloudUrl,
        credits: 10, // Initial credit value
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("✅ Track successfully submitted!");
        loadActiveCampaigns();
    }).catch(error => {
        console.error("❌ Error submitting track:", error);
        alert("❌ Error submitting track: " + error.message);
    });
};

// ✅ FUNCTION: REPOST A TRACK
window.repostTrack = async function (campaignId, ownerId, trackUrl) {
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

        // ✅ Get campaign data
        const campaignDoc = await campaignRef.get();
        if (!campaignDoc.exists) {
            alert("🚨 Campaign not found.");
            return;
        }
        const campaignData = campaignDoc.data();

        // ✅ Get user data
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            alert("🚨 User data not found.");
            return;
        }
        const userData = userDoc.data();

        // ✅ Get follower count to calculate credits
        let followers = Math.max(100, Math.floor(userData.followers / 100) * 100); // Round to nearest 100
        let creditsEarned = Math.min(followers / 100 * 10, 100); // Max 100 credits per repost

        if (campaignData.credits < creditsEarned) {
            alert("🚨 Not enough credits in the campaign.");
            return;
        }

        // ✅ Update Firestore (Transaction)
        await firebase.firestore().runTransaction(async (transaction) => {
            const freshUserDoc = await transaction.get(userRef);
            const freshCampaignDoc = await transaction.get(campaignRef);

            if (freshCampaignDoc.data().credits < creditsEarned) {
                throw new Error("Not enough credits in the campaign.");
            }

            transaction.update(userRef, {
                credits: firebase.firestore.FieldValue.increment(creditsEarned)
            });

            transaction.update(campaignRef, {
                credits: firebase.firestore.FieldValue.increment(-creditsEarned)
            });

            transaction.set(repostRef, {
                userId: user.uid,
                campaignId: campaignId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        // ✅ Open SoundCloud Repost Window
        window.open(trackUrl, "_blank");
        alert(`✅ Repost Successful! You earned ${creditsEarned} credits.`);

    } catch (error) {
        console.error("❌ Error reposting:", error);
        alert(`❌ Error: ${error.message}`);
    }
};

// ✅ FUNCTION: LOAD ACTIVE CAMPAIGNS
window.loadActiveCampaigns = function () {
    const campaignsDiv = document.getElementById("activeCampaigns");
    if (!campaignsDiv) return;

    db.collection("campaigns").orderBy("timestamp", "desc").onSnapshot(snapshot => {
        campaignsDiv.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            campaignsDiv.innerHTML += `
                <div class="campaign">
                    <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                        src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                    </iframe>
                    <button onclick="repostTrack('${doc.id}', '${data.owner}', '${data.track}')">Repost & Earn Credits</button>
                </div>
            `;
        });
    });
};
