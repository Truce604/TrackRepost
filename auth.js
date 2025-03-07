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
        const repostButton = document.getElementById("repostButton");
        
        if (user) {
            dashboard.innerHTML = `
                <h2>Welcome, ${user.email}!</h2>
                <p>User ID: ${user.uid}</p>
                <button onclick="logoutUser()">Logout</button>
            `;

            if (repostButton) {
                repostButton.disabled = false;
            }
        } else {
            dashboard.innerHTML = `
                <h2>You are not logged in.</h2>
                <p>Please log in or sign up.</p>
            `;

            if (repostButton) {
                repostButton.disabled = true;
            }
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
            alert("❌ You must be logged in to repost a track.");
            return;
        }

        // Increase repost count & credits
        let repostCountElement = document.getElementById("repostCount");
        let creditCountElement = document.getElementById("creditCount");

        let repostCount = parseInt(repostCountElement.innerText) || 0;
        let credits = parseInt(creditCountElement.innerText) || 0;

        repostCount++;
        credits += 10; // Earn 10 credits per repost

        repostCountElement.innerText = repostCount;
        creditCountElement.innerText = credits;

        alert("✅ Track reposted successfully! You earned 10 credits.");
    };
}

