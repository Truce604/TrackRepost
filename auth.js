// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");

    const auth = firebase.auth();
    const db = firebase.firestore();

    // ✅ Update Dashboard with User Info & Credits
    function updateDashboard(user) {
        const dashboard = document.getElementById("userDashboard");
        const creditDisplay = document.getElementById("creditCount");

        if (user) {
            db.collection("users").doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    const credits = userData.credits || 0;
                    creditDisplay.innerText = credits;
                } else {
                    // Create user data if it doesn't exist
                    db.collection("users").doc(user.uid).set({ credits: 0 });
                }
            });

            dashboard.innerHTML = `
                <h2>Welcome, ${user.email}!</h2>
                <p>User ID: ${user.uid}</p>
                <button onclick="logoutUser()">Logout</button>
            `;
        } else {
            dashboard.innerHTML = `
                <h2>You are not logged in.</h2>
                <p>Please log in or sign up.</p>
            `;
            creditDisplay.innerText = "0"; // Reset credits display on logout
        }
    }

    // ✅ Listen for Authentication State Changes
    auth.onAuthStateChanged(user => {
        updateDashboard(user);
    });

    // ✅ SIGNUP FUNCTION
    window.signupUser = function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                db.collection("users").doc(userCredential.user.uid).set({ credits: 0 });
                alert("✅ Signup Successful! Welcome " + userCredential.user.email);
                updateDashboard(userCredential.user);
            })
            .catch(error => {
                alert("❌ Signup Error: " + error.message);
                console.error("Signup Error:", error);
            });
    };

    // ✅ LOGIN FUNCTION
    window.loginUser = function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                alert("✅ Login Successful! Welcome " + userCredential.user.email);
                updateDashboard(userCredential.user);
            })
            .catch(error => {
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
            .catch(error => {
                alert("❌ Logout Error: " + error.message);
                console.error("Logout Error:", error);
            });
    };

    // ✅ REPOST FUNCTION (Earn Credits)
    window.repostTrack = function () {
        const user = auth.currentUser;
        if (!user) {
            alert("❌ You must be logged in to repost!");
            return;
        }

        const userRef = db.collection("users").doc(user.uid);
        userRef.get().then(doc => {
            if (doc.exists) {
                let currentCredits = doc.data().credits || 0;
                currentCredits += 10; // Earn 10 credits per repost

                userRef.update({ credits: currentCredits }).then(() => {
                    document.getElementById("creditCount").innerText = currentCredits;
                    alert("✅ You earned 10 credits!");
                });
            }
        });
    };
}
