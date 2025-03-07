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
        const repostCount = document.getElementById("repostCount");
        const creditCount = document.getElementById("creditCount");

        if (user) {
            dashboard.innerHTML = `
                <h2>Welcome, ${user.email}!</h2>
                <p>User ID: ${user.uid}</p>
                <button onclick="logoutUser()">Logout</button>
            `;

            // ✅ Load User Credits & Reposts from Firestore
            const userRef = db.collection("users").doc(user.uid);
            userRef.get().then((doc) => {
                if (doc.exists) {
                    repostCount.innerText = doc.data().reposts || 0;
                    creditCount.innerText = doc.data().credits || 0;
                } else {
                    userRef.set({ reposts: 0, credits: 0 });
                }
            }).catch((error) => {
                console.error("Error getting user data:", error);
            });

        } else {
            dashboard.innerHTML = `<h2>You are not logged in.</h2><p>Please log in or sign up.</p>`;
            repostCount.innerText = 0;
            creditCount.innerText = 0;
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
                db.collection("users").doc(userCredential.user.uid).set({
                    reposts: 0,
                    credits: 0
                });
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

    // ✅ REPOST & EARN CREDITS FUNCTION
    window.repostTrack = function () {
        const user = auth.currentUser;
        if (!user) {
            alert("❌ You must be logged in to repost!");
            return;
        }

        const userRef = db.collection("users").doc(user.uid);
        userRef.get().then((doc) => {
            if (doc.exists) {
                let reposts = doc.data().reposts || 0;
                let credits = doc.data().credits || 0;

                reposts += 1;
                credits += 5; // Earn 5 credits per repost

                userRef.update({ reposts, credits }).then(() => {
                    document.getElementById("repostCount").innerText = reposts;
                    document.getElementById("creditCount").innerText = credits;
                    alert("✅ Repost Successful! +5 Credits Earned!");
                });
            }
        }).catch((error) => {
            console.error("Error updating repost count:", error);
        });
    };
}
