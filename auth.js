// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");

    const auth = firebase.auth();
    const db = firebase.firestore();

    // ✅ Function to Update Dashboard with User Info
    function updateDashboard(user) {
        const dashboard = document.getElementById("userDashboard");
        const repostCountElement = document.getElementById("repostCount");
        const creditCountElement = document.getElementById("creditCount");

        if (user) {
            dashboard.innerHTML = `
                <h2>Welcome, ${user.email}!</h2>
                <p>User ID: ${user.uid}</p>
                <button onclick="logoutUser()">Logout</button>
            `;

            // ✅ Fetch user data from Firestore
            db.collection("users").doc(user.uid).get().then((doc) => {
                if (doc.exists) {
                    let userData = doc.data();
                    repostCountElement.innerText = userData.reposts || 0;
                    creditCountElement.innerText = userData.credits || 0;
                } else {
                    // ✅ Initialize Firestore data if missing
                    db.collection("users").doc(user.uid).set({
                        reposts: 0,
                        credits: 0
                    });
                    repostCountElement.innerText = "0";
                    creditCountElement.innerText = "0";
                }
            }).catch((error) => {
                console.error("❌ Error fetching user data:", error);
            });

        } else {
            dashboard.innerHTML = `
                <h2>You are not logged in.</h2>
                <p>Please log in or sign up.</p>
            `;

            repostCountElement.innerText = "0";
            creditCountElement.innerText = "0";
        }
    }

    // ✅ Listen for Authentication State Changes
    auth.onAuthStateChanged((user) => {
        console.log("🔥 Auth State Changed:", user);
        updateDashboard(user);
    });

    // ✅ SIGNUP FUNCTION
    window.signupUser = function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                alert("✅ Signup Successful! Welcome " + userCredential.user.email);
                return db.collection("users").doc(userCredential.user.uid).set({
                    reposts: 0,
                    credits: 0
                });
            })
            .then(() => {
                updateDashboard(auth.currentUser);
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

    // ✅ REPOST & EARN CREDITS FUNCTION (🔥 FIXED!)
    window.repostTrack = function () {
        const user = auth.currentUser;
        if (!user) {
            alert("❌ You must be logged in to repost a track.");
            return;
        }

        let userRef = db.collection("users").doc(user.uid);

        userRef.get().then((doc) => {
            if (doc.exists) {
                let userData = doc.data();
                let newRepostCount = (userData.reposts || 0) + 1;
                let newCredits = (userData.credits || 0) + 10; // Earn 10 credits per repost

                return userRef.update({
                    reposts: newRepostCount,
                    credits: newCredits
                });
            }
        }).then(() => {
            // ✅ Update UI (🔥 Fix: Updates Immediately!)
            userRef.get().then((updatedDoc) => {
                let updatedUserData = updatedDoc.data();
                document.getElementById("repostCount").innerText = updatedUserData.reposts;
                document.getElementById("creditCount").innerText = updatedUserData.credits;
                alert("✅ Track reposted successfully! You earned 10 credits.");
            });
        }).catch((error) => {
            console.error("❌ Error updating repost count:", error);
        });
    };
}
