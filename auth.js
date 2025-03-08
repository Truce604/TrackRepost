// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");

    const auth = firebase.auth();
    const db = firebase.firestore();

    // ✅ Setup Button Click Events
    document.addEventListener("DOMContentLoaded", () => {
        document.getElementById("signupBtn").addEventListener("click", signupUser);
        document.getElementById("loginBtn").addEventListener("click", loginUser);
        document.getElementById("logoutBtn").addEventListener("click", logoutUser);
        document.getElementById("submitTrackBtn").addEventListener("click", submitTrack);
    });

    // ✅ Update Dashboard
    function updateDashboard(user) {
        const dashboard = document.getElementById("userDashboard");
        const authMessage = document.getElementById("authMessage");

        if (!user) {
            dashboard.innerHTML = `
                <h2>You are not logged in.</h2>
                <p>Please log in or sign up.</p>
            `;
            authMessage.innerText = "";
            document.getElementById("currentTrackMessage").innerText = "No active campaign";
            return;
        }

        db.collection("users").doc(user.uid).onSnapshot((doc) => {
            if (doc.exists) {
                let data = doc.data();
                dashboard.innerHTML = `
                    <h2>Welcome, ${user.email}!</h2>
                    <p>Reposts: <span id="repostCount">${data.reposts || 0}</span></p>
                    <p>Credits: <span id="creditCount">${data.credits || 0}</span></p>
                    <button onclick="logoutUser()">Logout</button>
                `;

                authMessage.innerText = "✅ Logged in successfully!";

                if (data.track) {
                    document.getElementById("currentTrackMessage").innerHTML = `
                        <p>Active Campaign:</p>
                        <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                            src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                        </iframe>
                    `;
                }
            }
        });

        // ✅ Load active campaigns
        loadActiveCampaigns();
    }

    auth.onAuthStateChanged(updateDashboard);

    // ✅ SIGNUP FUNCTION
    function signupUser() {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                const user = userCredential.user;
                db.collection("users").doc(user.uid).set({
                    email: user.email,
                    credits: 0,
                    reposts: 0
                }).then(() => {
                    alert("✅ Signup Successful!");
                    updateDashboard(user);
                });
            })
            .catch(error => alert("❌ Signup Error: " + error.message));
    }

    // ✅ LOGIN FUNCTION
    function loginUser() {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                alert("✅ Login Successful!");
                updateDashboard(userCredential.user);
            })
            .catch(error => alert("❌ Login Error: " + error.message));
    }

    // ✅ LOGOUT FUNCTION
    function logoutUser() {
        auth.signOut()
            .then(() => {
                alert("✅ Logged Out!");
                updateDashboard(null);
            })
            .catch(error => alert("❌ Logout Error: " + error.message));
    }

    // ✅ SUBMIT TRACK FUNCTION (Starts a Campaign)
    function submitTrack() {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to submit a track.");
            return;
        }

        let soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();
        if (!soundcloudUrl.includes("soundcloud.com/")) {
            alert("❌ Invalid SoundCloud URL. Please enter a valid SoundCloud track link.");
            return;
        }

        db.collection("campaigns").doc(user.uid).set({
            owner: user.uid,
            email: user.email,
            track: soundcloudUrl,
            credits: 100  // 🔥 Default 100 credits when they start a campaign
        }).then(() => {
            alert("✅ Campaign started successfully!");
            loadActiveCampaigns();
        }).catch(error => console.error("Error starting campaign:", error));
    }

    // ✅ LOAD ACTIVE CAMPAIGNS
    function loadActiveCampaigns() {
        const campaignsDiv = document.getElementById("activeCampaigns");
        campaignsDiv.innerHTML = "<p>Loading campaigns...</p>";

        db.collection("campaigns").get()
            .then(querySnapshot => {
                campaignsDiv.innerHTML = "";
                querySnapshot.forEach(doc => {
                    let data = doc.data();
                    campaignsDiv.innerHTML += `
                        <div>
                            <p>${data.email} is promoting:</p>
                            <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                            </iframe>
                            <button onclick="repostTrack('${doc.id}', '${data.owner}')">Repost & Earn Credits</button>
                        </div>
                    `;
                });
            }).catch(error => console.error("Error loading campaigns:", error));
    }

    // ✅ REPOST FUNCTION (Users Earn Credits)
    function repostTrack(campaignId, ownerId) {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to repost.");
            return;
        }

        if (user.uid === ownerId) {
            alert("You cannot repost your own track.");
            return;
        }

        const userRef = db.collection("users").doc(user.uid);
        const ownerRef = db.collection("users").doc(ownerId);
        const campaignRef = db.collection("campaigns").doc(campaignId);

        db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const ownerDoc = await transaction.get(ownerRef);
            const campaignDoc = await transaction.get(campaignRef);

            if (!userDoc.exists || !ownerDoc.exists || !campaignDoc.exists) {
                throw new Error("❌ Error: User or Campaign not found.");
            }

            let userData = userDoc.data();
            let ownerData = ownerDoc.data();
            let campaignData = campaignDoc.data();

            if (campaignData.credits < 10) {
                alert("❌ This campaign has run out of credits.");
                return;
            }

            transaction.update(userRef, { credits: (userData.credits || 0) + 10, reposts: (userData.reposts || 0) + 1 });
            transaction.update(ownerRef, { credits: (ownerData.credits || 0) - 10 });
            transaction.update(campaignRef, { credits: campaignData.credits - 10 });

            alert("✅ Repost successful! You earned 10 credits.");
        }).catch(error => {
            console.error("Error reposting:", error);
            alert("Error processing repost. Try again.");
        });
    }
}
