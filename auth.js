// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");

    const firebaseConfig = {
        apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw",
        authDomain: "trackrepost-921f8.firebaseapp.com",
        projectId: "trackrepost-921f8",
        storageBucket: "trackrepost-921f8.appspot.com",
        messagingSenderId: "967836604288",
        appId: "1:967836604288:web:3782d50de7384c9201d365",
        measurementId: "G-G65Q3HC3R8"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const auth = firebase.auth();
    const db = firebase.firestore();

    // ✅ Enable Firestore Offline Mode for Faster Performance
    db.enablePersistence()
        .then(() => console.log("✅ Firestore offline mode enabled"))
        .catch(error => console.warn("⚠️ Firestore persistence error:", error));

    // ✅ Set Firebase Auth Persistence
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            console.log("✅ Auth Persistence Set to LOCAL");
        })
        .catch(error => {
            console.error("❌ Error setting auth persistence:", error.message);
        });

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
}

// ✅ LOGIN FUNCTION (Ensure it is globally accessible)
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
                credits: 0,
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

// ✅ LOGOUT FUNCTION
window.logoutUser = function () {
    auth.signOut()
        .then(() => {
            alert("✅ Logged Out!");
            updateDashboard(null);
        })
        .catch(error => {
            console.error("❌ Logout Error:", error);
            alert("❌ Logout Error: " + error.message);
        });
};

// ✅ UPDATE DASHBOARD FUNCTION
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

