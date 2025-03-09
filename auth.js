// ✅ auth.js - Authentication, Firestore, and SoundCloud Integration

// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw",
    authDomain: "trackrepost-921f8.firebaseapp.com",
    projectId: "trackrepost-921f8",
    storageBucket: "trackrepost-921f8.appspot.com",
    messagingSenderId: "967836604288",
    appId: "1:967836604288:web:3782d50de7384c9201d365",
    measurementId: "G-G65Q3HC3R8"
};

// ✅ Initialize Firebase Globally
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// ✅ Ensure auth and db are globally accessible
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Enable Firestore Offline Mode for Faster Performance
db.enablePersistence()
    .then(() => console.log("✅ Firestore offline mode enabled"))
    .catch(error => console.warn("⚠️ Firestore persistence error:", error));

// ✅ Set Firebase Auth Persistence
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => console.log("✅ Auth Persistence Set to LOCAL"))
    .catch(error => console.error("❌ Error setting auth persistence:", error.message));

// ✅ LISTEN FOR AUTH CHANGES
auth.onAuthStateChanged(user => {
    if (user) {
        console.log("✅ User detected:", user.email);
        updateDashboard(user);
        loadActiveCampaigns(); // ✅ Ensure campaigns load when user logs in
    } else {
        console.warn("🚨 No user detected.");
        updateDashboard(null);
    }
});

// ✅ LOGIN FUNCTION
window.loginUser = function () {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            alert("✅ Login Successful!");
            updateDashboard(userCredential.user);
        })
        .catch(error => {
            console.error("❌ Login Error:", error);
            alert("❌ Login Error: " + error.message);
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
                credits: 10, // ✅ Start with 10 free credits
                reposts: 0
            });
        })
        .then(() => {
            alert("✅ Signup Successful!");
            updateDashboard(auth.currentUser);
        })
        .catch(error => {
            console.error("❌ Signup Error:", error);
            alert("❌ Signup Error: " + error.message);
        });
};

// ✅ FUNCTION: UPDATE DASHBOARD
function updateDashboard(user) {
    const dashboard = document.getElementById("userDashboard");

    if (!user) {
        dashboard.innerHTML = `<h2>You are not logged in.</h2><p>Please log in or sign up.</p>`;
        return;
    }

    db.collection("users").doc(user.uid).get().then(doc => {
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

// ✅ FUNCTION: SUBMIT SOUNDCLOUD TRACK
window.submitTrack = function () {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to submit a track.");
        return;
    }

    let soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();
    if (!soundcloudUrl.includes("soundcloud.com/")) {
        alert("Invalid SoundCloud URL.");
        return;
    }

    db.collection("campaigns").add({
        owner: user.uid,
        track: soundcloudUrl,
        credits: 10
    }).then(() => {
        alert("✅ Track submitted!");
        loadActiveCampaigns(); // Refresh campaigns
    }).catch(error => {
        console.error("Error submitting track:", error);
    });
};

// ✅ FUNCTION: LOAD ACTIVE CAMPAIGNS
window.loadActiveCampaigns = function () {
    const campaignsDiv = document.getElementById("activeCampaigns");
    if (!campaignsDiv) {
        console.error("❌ Campaigns section not found");
        return;
    }

    campaignsDiv.innerHTML = "<p>Loading...</p>";

    db.collection("campaigns").get()
        .then(querySnapshot => {
            console.log(`🔍 Found ${querySnapshot.size} campaigns in Firestore`);
            campaignsDiv.innerHTML = "";

            if (querySnapshot.empty) {
                campaignsDiv.innerHTML = "<p>No active campaigns available.</p>";
            } else {
                querySnapshot.forEach(doc => {
                    let data = doc.data();
                    campaignsDiv.innerHTML += `
                        <div id="campaign-${doc.id}">
                            <iframe loading="lazy" width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                            </iframe>
                            <button onclick="repostTrack('${doc.id}', '${data.owner}', '${data.credits}', '${data.track}')">Repost</button>
                        </div>
                    `;
                });
            }
        })
        .catch(error => console.error("❌ Error loading campaigns:", error));
};

// ✅ FUNCTION: REPOST TRACK & EARN CREDITS
window.repostTrack = function (campaignId, ownerId, cost, trackUrl) {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to repost.");
        return;
    }

    if (user.uid === ownerId) {
        alert("You cannot repost your own track.");
        return;
    }

    db.runTransaction(transaction => {
        return transaction.get(db.collection("users").doc(user.uid)).then(userDoc => {
            if (!userDoc.exists) {
                throw "User does not exist!";
            }

            let userData = userDoc.data();
            let newCredits = userData.credits + 5; // ✅ Earn 5 credits per repost

            // ✅ Update user credits
            transaction.update(db.collection("users").doc(user.uid), { credits: newCredits });

            // ✅ Deduct credits from campaign owner
            let campaignOwnerRef = db.collection("users").doc(ownerId);
            return transaction.get(campaignOwnerRef).then(ownerDoc => {
                if (!ownerDoc.exists) {
                    throw "Campaign owner does not exist!";
                }

                let ownerData = ownerDoc.data();
                let updatedOwnerCredits = ownerData.credits - cost;

                transaction.update(campaignOwnerRef, { credits: updatedOwnerCredits });
            });
        });
    }).then(() => {
        alert("✅ Repost successful! You earned 5 credits.");
        updateDashboard(user);
    }).catch(error => {
        console.error("❌ Error reposting:", error);
        alert("❌ Error reposting: " + error.message);
    });
};
