// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Initialize Firebase (Only Declare Once)
if (!firebase.apps.length) {
    firebase.initializeApp({
        apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw",
        authDomain: "trackrepost-921f8.firebaseapp.com",
        projectId: "trackrepost-921f8",
        storageBucket: "trackrepost-921f8.appspot.com",
        messagingSenderId: "967836604288",
        appId: "1:967836604288:web:3782d50de7384c9201d365",
        measurementId: "G-G65Q3HC3R8"
    });
    console.log("✅ Firebase Initialized Successfully!");
}

// ✅ Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ SoundCloud Integration
SC.initialize({
    client_id: "YOUR_SOUNDCLOUD_CLIENT_ID",
    redirect_uri: "https://trackrepost.com/callback"
});

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
            document.getElementById("authMessage").textContent = `❌ Signup Error: ${error.message}`;
        });
};

// ✅ LOGOUT FUNCTION
window.logoutUser = function () {
    auth.signOut().then(() => {
        document.getElementById("authMessage").textContent = "✅ Logged out successfully!";
        updateDashboard(null);
    }).catch(error => {
        document.getElementById("authMessage").textContent = `❌ Logout Error: ${error.message}`;
    });
};

// ✅ LOGIN WITH SOUNDCLOUD
window.loginWithSoundCloud = function () {
    SC.connect().then(() => {
        return SC.get('/me');
    }).then(user => {
        console.log("✅ SoundCloud User:", user);
        alert(`Logged in as ${user.username}`);
    }).catch(error => {
        console.error("❌ SoundCloud Login Error:", error);
        alert("Error logging into SoundCloud.");
    });
};

// ✅ FUNCTION: UPDATE DASHBOARD
function updateDashboard(user) {
    const dashboard = document.getElementById("userDashboard");

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
        }
    });
}

// ✅ FUNCTION: LOAD ACTIVE CAMPAIGNS
window.loadActiveCampaigns = function () {
    const campaignsDiv = document.getElementById("activeCampaigns");
    if (!campaignsDiv) {
        console.error("❌ Campaigns section not found");
        return;
    }

    campaignsDiv.innerHTML = "<p>⏳ Loading campaigns...</p>";

    db.collection("campaigns").orderBy("credits", "desc").onSnapshot(snapshot => {
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

// ✅ FUNCTION: REPOST TRACK & EARN CREDITS
window.repostTrack = function (campaignId, ownerId, cost) {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to repost.");
        return;
    }

    if (user.uid === ownerId) {
        alert("You cannot repost your own track.");
        return;
    }

    db.runTransaction(async (transaction) => {
        const userRef = db.collection("users").doc(user.uid);
        const ownerRef = db.collection("users").doc(ownerId);
        const campaignRef = db.collection("campaigns").doc(campaignId);

        const userDoc = await transaction.get(userRef);
        const ownerDoc = await transaction.get(ownerRef);
        const campaignDoc = await transaction.get(campaignRef);

        if (!userDoc.exists || !ownerDoc.exists || !campaignDoc.exists) {
            throw new Error("Invalid user or campaign data.");
        }

        let userCredits = userDoc.data().credits;
        let ownerCredits = ownerDoc.data().credits;

        let updatedUserCredits = userCredits + 5;
        let updatedOwnerCredits = ownerCredits - cost;

        if (updatedOwnerCredits < 0) {
            throw new Error("Campaign owner does not have enough credits.");
        }

        transaction.update(userRef, { credits: updatedUserCredits });
        transaction.update(ownerRef, { credits: updatedOwnerCredits });

        console.log("✅ Repost transaction successful!");

    }).then(() => {
        alert("✅ Repost successful! You earned 5 credits.");
        updateDashboard(user);
        loadActiveCampaigns();
    }).catch(error => {
        console.error("❌ Error reposting:", error);
        alert(`❌ Error reposting: ${error.message}`);
    });
};

// ✅ AUTOLOAD CAMPAIGNS ON PAGE LOAD
document.addEventListener("DOMContentLoaded", () => {
    loadActiveCampaigns();
});
