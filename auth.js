// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");

    const auth = firebase.auth();
    const db = firebase.firestore();

    // ✅ Function to Update Dashboard with User Info + Reposts & Credits
    function updateDashboard(user) {
        const dashboard = document.getElementById("userDashboard");
        if (user) {
            const userRef = db.collection("users").doc(user.uid);

            userRef.get().then((doc) => {
                let reposts = 0;
                let credits = 0;

                if (doc.exists) {
                    reposts = doc.data().reposts || 0;
                    credits = doc.data().credits || 0;
                } else {
                    // If user doesn't exist in Firestore, create them
                    userRef.set({ reposts: 0, credits: 0 });
                }

                dashboard.innerHTML = `
                    <h2>Welcome, ${user.email}!</h2>
                    <p>User ID: ${user.uid}</p>
                    <p>Reposts: <span id="repostCount">${reposts}</span></p>
                    <p>Credits: <span id="creditCount">${credits}</span></p>
                    <button onclick="logoutUser()">Logout</button>
                `;
            });
        } else {
            dashboard.innerHTML = `
                <h2>You are not logged in.</h2>
                <p>Please log in or sign up.</p>
            `;
        }
    }

    // ✅ Listen for Authentication State Changes
    auth.onAuthStateChanged((user) => {
        updateDashboard(user);
    });

    // ✅ SIGNUP FUNCTION
    window.signupUser = function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                alert("✅ Signup Successful! Welcome " + userCredential.user.email);
                db.collection("users").doc(userCredential.user.uid).set({ reposts: 0, credits: 0 });
                updateDashboard(userCredential.user);
            })
            .catch((error) => {
                alert("❌ Signup Error: " + error.message);
                console.error("Signup Error:", error);
            });
    };

    // ✅ LOGIN FUNCTION
    window.loginUser = function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                alert("✅ Login Successful! Welcome " + userCredential.user.email);
                updateDashboard(userCredential.user);
            })
            .catch((error) => {
                alert("❌ Login Error: " + error.message);
                console.error("Login Error:", error);
            });
    };

    // ✅ LOGOUT FUNCTION
    window.logoutUser = function () {
        auth.signOut()
            .then(() => {
                alert("✅ Logged Out!");
                updateDashboard(null);
            })
            .catch((error) => {
                alert("❌ Logout Error: " + error.message);
                console.error("Logout Error:", error);
            });
    };

    // ✅ REPOST FUNCTION (Earn Credits)
    window.repostTrack = function () {
        const user = auth.currentUser;
        if (!user) {
            alert("❌ You must be logged in to repost a track.");
            return;
        }

        const userRef = db.collection("users").doc(user.uid);
        userRef.get().then((doc) => {
            let reposts = doc.exists ? doc.data().reposts + 1 : 1;
            let credits = doc.exists ? doc.data().credits + 10 : 10;

            userRef.set({ reposts, credits }, { merge: true }).then(() => {
                document.getElementById("repostCount").innerText = reposts;
                document.getElementById("creditCount").innerText = credits;

                alert("✅ Track Reposted! You earned 10 credits!");
            });
        }).catch((error) => {
            console.error("❌ Error reposting track:", error);
        });
    };
}

