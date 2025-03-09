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

// ✅ LISTEN FOR AUTH CHANGES WITH SESSION CHECK
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

// ✅ FUNCTION: UPDATE DASHBOARD
window.updateDashboard = function (user) {
    const dashboard = document.getElementById("userDashboard");
    const authMessage = document.getElementById("authMessage");

    if (!dashboard || !authMessage) {
        console.error("❌ Dashboard elements not found.");
        return;
    }

    if (!user) {
        dashboard.innerHTML = `<h2>You are not logged in.</h2><p>Please log in or sign up.</p>`;
        authMessage.innerText = "";
        return;
    }

    db.collection("users").doc(user.uid).get().then(doc => {
        if (doc.exists) {
            let data = doc.data();
            dashboard.innerHTML = `
                <h2>Welcome, ${user.email}!</h2>
                <p>Reposts: <span id="repostCount">${data.reposts || 0}</span></p>
                <p>Credits: <span id="creditCount">${data.credits || 0}</span></p>
                <button onclick="logoutUser()">Logout</button>
            `;
            authMessage.innerText = "✅ Logged in successfully!";
        } else {
            console.warn("🚨 User data not found in Firestore!");
        }
    }).catch(error => {
        console.error("❌ Error loading user data:", error);
    });
};

// ✅ FUNCTION: REPOST A TRACK
window.repostTrack = function (campaignId, campaignOwner, campaignCredits, trackUrl) {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to repost.");
        return;
    }

    if (user.uid === campaignOwner) {
        alert("You cannot repost your own campaign.");
        return;
    }

    db.runTransaction(async (transaction) => {
        const userRef = db.collection("users").doc(user.uid);
        const ownerRef = db.collection("users").doc(campaignOwner);

        const userDoc = await transaction.get(userRef);
        const ownerDoc = await transaction.get(ownerRef);

        if (!userDoc.exists || !ownerDoc.exists) {
            throw new Error("User data not found!");
        }

        let newCredits = ownerDoc.data().credits - 10;
        let userEarnedCredits = userDoc.data().credits + 10;
        let userReposts = (userDoc.data().reposts || 0) + 1;

        transaction.update(userRef, { credits: userEarnedCredits, reposts: userReposts });
        transaction.update(ownerRef, { credits: newCredits });

        return Promise.resolve();
    })
    .then(() => {
        alert("✅ Reposted successfully! You earned 10 credits.");
        updateDashboard(user);
    })
    .catch(error => console.error("Error reposting:", error));
};
