// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");

    const auth = firebase.auth();
    const db = firebase.firestore();

    // ✅ Function to Update Dashboard
    function updateDashboard(user) {
        const dashboard = document.getElementById("userDashboard");
        const campaignContainer = document.getElementById("activeCampaigns");

        if (!user) {
            dashboard.innerHTML = `
                <h2>You are not logged in.</h2>
                <p>Please log in or sign up.</p>
            `;
            campaignContainer.innerHTML = "";
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

                // If user has a campaign, display it
                if (data.track) {
                    document.getElementById("currentTrackMessage").innerHTML = `
                        <h3>Your Active Campaign</h3>
                        <p><strong>Track:</strong> <a href="${data.track}" target="_blank">${data.track}</a></p>
                        <button onclick="endCampaign()">End Campaign</button>
                    `;
                } else {
                    document.getElementById("currentTrackMessage").innerHTML = "No active campaign.";
                }
            }
        });

        // Fetch active campaigns from Firestore
        db.collection("users").where("track", "!=", "").onSnapshot((querySnapshot) => {
            campaignContainer.innerHTML = "<h2>🔥 Active Campaigns</h2>";
            querySnapshot.forEach((doc) => {
                let trackData = doc.data();
                if (trackData.track) {
                    campaignContainer.innerHTML += `
                        <div class="campaign">
                            <p><strong>${doc.id}</strong></p>
                            <p><a href="${trackData.track}" target="_blank">${trackData.track}</a></p>
                            <button onclick="repostTrack('${doc.id}')">Repost & Earn Credits</button>
                        </div>
                    `;
                }
            });
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
                    track: ""
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

    // ✅ REPOST FUNCTION - Earn Credits
    window.repostTrack = async function (userId) {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to repost and earn credits.");
            return;
        }

        const userRef = db.collection("users").doc(user.uid);
        const targetUserRef = db.collection("users").doc(userId);

        try {
            const userDoc = await userRef.get();
            const targetUserDoc = await targetUserRef.get();

            if (!userDoc.exists || !targetUserDoc.exists) {
                alert("Error finding user data.");
                return;
            }

            let userData = userDoc.data();
            let targetData = targetUserDoc.data();

            if (userData.credits < 5) {
                alert("Not enough credits to repost.");
                return;
            }

            // Deduct credits and update repost count
            let newCredits = userData.credits - 5;
            let newReposts = (userData.reposts || 0) + 1;

            await userRef.update({ credits: newCredits, reposts: newReposts });

            // Reward the track owner
            let ownerNewCredits = (targetData.credits || 0) + 5;
            await targetUserRef.update({ credits: ownerNewCredits });

            document.getElementById("repostCount").innerText = newReposts;
            document.getElementById("creditCount").innerText = newCredits;

            alert("✅ Repost successful! You used 5 credits.");
        } catch (error) {
            console.error("Error updating credits:", error);
            alert("Error processing repost. Try again.");
        }
    };

    // ✅ END CAMPAIGN FUNCTION
    window.endCampaign = async function () {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in.");
            return;
        }

        const userRef = db.collection("users").doc(user.uid);
        await userRef.update({ track: "" });

        document.getElementById("currentTrackMessage").innerHTML = "No active campaign.";
        alert("✅ Campaign ended.");
    };
}
