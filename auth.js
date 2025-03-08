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
            document.getElementById("currentTrackMessage").innerText = "No active campaign";
            return;
        }

        // Fetch user data from Firestore
        db.collection("users").doc(user.uid).onSnapshot((doc) => {
            if (doc.exists) {
                let data = doc.data();
                dashboard.innerHTML = `
                    <h2>Welcome, ${user.email}!</h2>
                    <p>Reposts: <span id="repostCount">${data.reposts || 0}</span></p>
                    <p>Credits: <span id="creditCount">${data.credits || 0}</span></p>
                    <button onclick="logoutUser()">Logout</button>
                `;

                if (data.track) {
                    document.getElementById("currentTrackMessage").innerHTML = `
                        <p>Active Campaign: <a href="${data.track}" target="_blank">${data.track}</a></p>
                    `;
                }
            }
        });

        // Load active campaigns
        loadActiveCampaigns();
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
                    track: null
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

    // ✅ SUBMIT TRACK FUNCTION (Save in Firestore)
    window.submitTrack = async function () {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to submit a track.");
            return;
        }

        const soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();
        if (!soundcloudUrl) {
            alert("Please enter a valid SoundCloud URL.");
            return;
        }

        const userRef = db.collection("users").doc(user.uid);
        try {
            await userRef.update({ track: soundcloudUrl });

            document.getElementById("currentTrackMessage").innerHTML = `
                <p>Active Campaign: <a href="${soundcloudUrl}" target="_blank">${soundcloudUrl}</a></p>
            `;

            alert("✅ SoundCloud track submitted successfully!");
            loadActiveCampaigns();
        } catch (error) {
            console.error("Error submitting track:", error);
            alert("Error submitting track. Try again.");
        }
    };

    // ✅ LOAD ACTIVE CAMPAIGNS FUNCTION
    function loadActiveCampaigns() {
        const campaignsDiv = document.getElementById("activeCampaigns");
        campaignsDiv.innerHTML = ""; // Clear existing campaigns

        db.collection("users").where("track", "!=", null).get().then((querySnapshot) => {
            if (querySnapshot.empty) {
                campaignsDiv.innerHTML = "<p>No active campaigns.</p>";
                return;
            }

            querySnapshot.forEach((doc) => {
                let data = doc.data();
                if (data.track) {
                    campaignsDiv.innerHTML += `
                        <div class="campaign">
                            <p><strong>${data.email}</strong> is promoting:</p>
                            <a href="${data.track}" target="_blank">${data.track}</a>
                            <button onclick="repostTrack('${doc.id}', '${data.track}')">Repost & Earn Credits</button>
                        </div>
                    `;
                }
            });
        }).catch(error => {
            console.error("Error loading campaigns:", error);
        });
    }

    // ✅ REPOST FUNCTION - Earn Credits
    window.repostTrack = async function (userId, trackUrl) {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to repost and earn credits.");
            return;
        }

        if (user.uid === userId) {
            alert("You cannot repost your own track.");
            return;
        }

        const userRef = db.collection("users").doc(user.uid);
        const trackRef = db.collection("users").doc(userId);

        try {
            const userDoc = await userRef.get();
            const trackDoc = await trackRef.get();

            if (!userDoc.exists || !trackDoc.exists) {
                alert("Error finding user or track.");
                return;
            }

            let userData = userDoc.data();
            let newReposts = (userData.reposts || 0) + 1;
            let newCredits = (userData.credits || 0) + 10; // Earn 10 credits per repost

            await userRef.update({
                reposts: newReposts,
                credits: newCredits
            });

            alert(`✅ You reposted ${trackUrl} and earned 10 credits!`);
            updateDashboard(user);
        } catch (error) {
            console.error("Error updating credits:", error);
            alert("Error processing repost. Try again.");
        }
    };
}
