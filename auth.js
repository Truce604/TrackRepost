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

    // ✅ Update UI Function
    function updateDashboard(user) {
        const dashboard = document.getElementById("userDashboard");
        if (!user) {
            dashboard.innerHTML = `<p>Please log in or sign up.</p>`;
            document.getElementById("currentTrackMessage").innerText = "No active campaign";
            document.getElementById("logoutBtn").style.display = "none";
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

                document.getElementById("logoutBtn").style.display = "block";

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

        // Load active campaigns
        loadActiveCampaigns();
    }

    // ✅ Listen for Authentication Changes
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

    // ✅ SUBMIT TRACK FUNCTION (Start a Campaign)
    async function submitTrack() {
        const user = auth.currentUser;
        if (!user) {
            alert("❌ You must be logged in to start a campaign.");
            return;
        }

        let soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();
        if (!soundcloudUrl.includes("soundcloud.com/")) {
            alert("❌ Invalid SoundCloud URL. Please enter a valid SoundCloud track link.");
            return;
        }

        try {
            await db.collection("users").doc(user.uid).update({ track: soundcloudUrl });

            // ✅ Also add this track to the campaigns collection
            await db.collection("campaigns").doc(user.uid).set({
                owner: user.uid,
                track: soundcloudUrl,
                credits: 10  // Default credits for a campaign
            });

            alert("✅ Track submitted! Your campaign is now active.");
            loadActiveCampaigns();
        } catch (error) {
            console.error("❌ Error starting campaign:", error);
            alert("❌ Could not start campaign. Try again.");
        }
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
                            <p>🔥 <b>Active Campaign:</b> </p>
                            <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                            </iframe>
                            <button onclick="repostTrack('${doc.id}')">Repost & Earn Credits</button>
                        </div>
                        <hr>
                    `;
                });
            })
            .catch(error => {
                console.error("❌ Error loading campaigns:", error);
                campaignsDiv.innerHTML = "<p>⚠️ No campaigns available.</p>";
            });
    }

    // ✅ REPOST FUNCTION (Earn Credits)
    async function repostTrack(campaignId) {
        const user = auth.currentUser;
        if (!user) {
            alert("❌ You must be logged in to repost.");
            return;
        }

        try {
            const campaignRef = db.collection("campaigns").doc(campaignId);
            const campaignDoc = await campaignRef.get();

            if (!campaignDoc.exists) {
                alert("❌ Campaign not found.");
                return;
            }

            let campaignData = campaignDoc.data();

            // ✅ Check if campaign still has credits
            if (campaignData.credits <= 0) {
                alert("❌ This campaign has run out of credits.");
                return;
            }

            // ✅ Reduce credits from the campaign
            await campaignRef.update({ credits: campaignData.credits - 5 });

            // ✅ Reward user with 5 credits
            const userRef = db.collection("users").doc(user.uid);
            const userDoc = await userRef.get();
            let newCredits = (userDoc.data().credits || 0) + 5;
            await userRef.update({ credits: newCredits });

            alert("✅ You reposted & earned 5 credits!");
            updateDashboard(user);
            loadActiveCampaigns();
        } catch (error) {
            console.error("❌ Error reposting track:", error);
            alert("❌ Error reposting. Try again.");
        }
    }
}
