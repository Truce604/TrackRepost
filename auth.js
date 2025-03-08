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
                        <p>Active Campaign:</p>
                        <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                            src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                        </iframe>
                    `;
                }
            }
        });

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
                    reposts: 0,
                    repostedTracks: []
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

    // ✅ SUBMIT TRACK FUNCTION
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

        db.collection("users").doc(user.uid).update({ track: soundcloudUrl, credits: 100 }) // ✅ Give 100 credits for testing
            .then(() => {
                alert("✅ Track submitted!");
                loadActiveCampaigns();
            });
    }

    // ✅ REPOST FUNCTION - Earn Credits & Deduct from Campaign Owner
    function repostTrack(campaignId) {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to repost and earn credits.");
            return;
        }

        const campaignRef = db.collection("users").doc(campaignId);
        const userRef = db.collection("users").doc(user.uid);

        db.runTransaction(async (transaction) => {
            const campaignDoc = await transaction.get(campaignRef);
            const userDoc = await transaction.get(userRef);

            if (!campaignDoc.exists || campaignDoc.data().credits <= 0) {
                alert("❌ This campaign is no longer available.");
                return;
            }

            let campaignData = campaignDoc.data();
            let userData = userDoc.exists ? userDoc.data() : { credits: 0, reposts: 0, repostedTracks: [] };

            // ❌ Prevent double reposting
            if (userData.repostedTracks && userData.repostedTracks.includes(campaignId)) {
                alert("❌ You have already reposted this track.");
                return;
            }

            // ✅ Reduce credits from campaign owner
            const newCampaignCredits = campaignData.credits - 10;
            transaction.update(campaignRef, { credits: newCampaignCredits });

            // ✅ Add credits to the user reposting
            const newUserCredits = (userData.credits || 0) + 10;
            const newUserReposts = (userData.reposts || 0) + 1;
            let updatedRepostedTracks = [...(userData.repostedTracks || []), campaignId];

            transaction.set(userRef, {
                credits: newUserCredits,
                reposts: newUserReposts,
                repostedTracks: updatedRepostedTracks
            }, { merge: true });

            alert("✅ Repost successful! You earned 10 credits.");
        }).then(() => loadActiveCampaigns());
    }

    // ✅ LOAD ACTIVE CAMPAIGNS
    function loadActiveCampaigns() {
        const campaignsDiv = document.getElementById("activeCampaigns");
        campaignsDiv.innerHTML = "<p>Loading...</p>";

        db.collection("users").where("track", "!=", null).get()
            .then(querySnapshot => {
                campaignsDiv.innerHTML = "";
                querySnapshot.forEach(doc => {
                    let data = doc.data();
                    if (data.credits > 0) {
                        campaignsDiv.innerHTML += `
                            <div>
                                <p>${data.email} is promoting:</p>
                                <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                    src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                                </iframe>
                                <button onclick="repostTrack('${doc.id}')">Repost & Earn Credits</button>
                            </div>
                        `;
                    }
                });

                if (campaignsDiv.innerHTML === "") {
                    campaignsDiv.innerHTML = "<p>No active campaigns.</p>";
                }
            })
            .catch(error => console.error("Error loading campaigns:", error));
    }
}
