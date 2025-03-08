// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");

    const auth = firebase.auth();
    const db = firebase.firestore();

    // ✅ Update UI Function
    function updateDashboard(user) {
        const dashboard = document.getElementById("userDashboard");
        if (!user) {
            dashboard.innerHTML = `
                <h2>You are not logged in.</h2>
                <p>Please log in or sign up.</p>
            `;
            return;
        }

        // Fetch user data from Firestore
        db.collection("users").doc(user.uid).onSnapshot((doc) => {
            if (doc.exists) {
                let data = doc.data();
                let campaignStatus = data.track ? `Current Campaign: ${data.track}` : "No active campaign";
                
                dashboard.innerHTML = `
                    <h2>Welcome, ${user.email}!</h2>
                    <p>Reposts: <span id="repostCount">${data.reposts || 0}</span></p>
                    <p>Credits: <span id="creditCount">${data.credits || 0}</span></p>
                    <p>${campaignStatus}</p>
                    <button onclick="logoutUser()">Logout</button>
                `;
            } else {
                console.error("User data missing in Firestore.");
            }
        });
    }

    // ✅ Listen for Authentication Changes
    auth.onAuthStateChanged(updateDashboard);

    // ✅ SIGNUP FUNCTION
    window.signupUser = function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                db.collection("users").doc(user.uid).set({
                    email: user.email,
                    credits: 0,
                    reposts: 0,
                    track: null, // No campaign yet
                    premium: false // Default to free user
                }).then(() => {
                    alert("✅ Signup Successful! Welcome " + user.email);
                    updateDashboard(user);
                }).catch(error => console.error("Error saving user:", error));
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

    // ✅ SUBMIT TRACK FUNCTION - Free users limited to 1 campaign
    window.submitTrack = async function () {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to submit a campaign.");
            return;
        }

        const soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();
        if (!soundcloudUrl) {
            alert("Please enter a valid SoundCloud URL.");
            return;
        }

        const userRef = db.collection("users").doc(user.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            alert("User data not found. Please sign up again.");
            return;
        }

        let userData = userDoc.data();
        if (!userData.premium && userData.track) {
            alert("Free users can only run ONE campaign at a time. Upgrade to premium to run multiple.");
            return;
        }

        try {
            await userRef.update({
                track: soundcloudUrl
            });

            alert("✅ SoundCloud campaign submitted successfully!");
            updateDashboard(user);

        } catch (error) {
            console.error("Error submitting track:", error);
            alert("Error processing campaign. Try again.");
        }
    };

    // ✅ REPOST FUNCTION - Earn Credits
    window.repostTrack = async function () {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to repost and earn credits.");
            return;
        }

        const userRef = db.collection("users").doc(user.uid);

        try {
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                alert("User data not found. Please sign up again.");
                return;
            }

            let userData = userDoc.data();
            let newReposts = (userData.reposts || 0) + 1;
            let newCredits = (userData.credits || 0) + 10; // Earn 10 credits per repost

            await userRef.update({
                reposts: newReposts,
                credits: newCredits
            });

            alert("✅ Repost successful! You earned 10 credits.");
        } catch (error) {
            console.error("Error updating credits:", error);
            alert("Error processing repost. Try again.");
        }
    };
}
