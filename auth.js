// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");

    const auth = firebase.auth();
    const db = firebase.firestore();

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

    // ✅ UPDATE DASHBOARD
    function updateDashboard(user) {
        const dashboard = document.getElementById("userDashboard");
        const authMessage = document.getElementById("authMessage");

        if (!user) {
            dashboard.innerHTML = `<h2>You are not logged in.</h2><p>Please log in or sign up.</p>`;
            authMessage.innerText = "";
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

        // Load active campaigns
        loadActiveCampaigns();
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
            alert("Invalid SoundCloud URL.");
            return;
        }

        db.collection("campaigns").add({
            owner: user.uid,
            track: soundcloudUrl,
            credits: 10 // Default credits for new campaigns
        })
        .then(() => {
            alert("✅ Track submitted!");
            loadActiveCampaigns();
        })
        .catch(error => console.error("Error submitting track:", error));
    }

    // ✅ LOAD ACTIVE CAMPAIGNS
    function loadActiveCampaigns() {
        const campaignsDiv = document.getElementById("activeCampaigns");
        campaignsDiv.innerHTML = "<p>Loading...</p>";

        db.collection("campaigns").get()
            .then(querySnapshot => {
                campaignsDiv.innerHTML = "";
                querySnapshot.forEach(doc => {
                    let data = doc.data();
                    campaignsDiv.innerHTML += `
                        <div>
                            <p>${data.owner} is promoting:</p>
                            <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                            </iframe>
                            <button onclick="repostTrack('${doc.id}', '${data.owner}', ${data.credits})">Repost</button>
                        </div>
                    `;
                });
            })
            .catch(error => console.error("Error loading campaigns:", error));
    }

    // ✅ REPOST FUNCTION
    function repostTrack(campaignId, campaignOwner, campaignCredits) {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to repost.");
            return;
        }

        if (user.uid === campaignOwner) {
            alert("You cannot repost your own campaign.");
            return;
        }

        // Update credits and reposts in Firestore
        db.runTransaction(async (transaction) => {
            const campaignRef = db.collection("campaigns").doc(campaignId);
            const userRef = db.collection("users").doc(user.uid);
            const ownerRef = db.collection("users").doc(campaignOwner);

            const campaignDoc = await transaction.get(campaignRef);
            const userDoc = await transaction.get(userRef);
            const ownerDoc = await transaction.get(ownerRef);

            if (!campaignDoc.exists || !userDoc.exists || !ownerDoc.exists) {
                throw new Error("Document does not exist!");
            }

            let newCredits = ownerDoc.data().credits - 10; // Deduct 10 credits from the owner
            let userEarnedCredits = userDoc.data().credits + 10; // Earn 10 credits for reposting
            let userReposts = userDoc.data().reposts + 1;

            transaction.update(userRef, { credits: userEarnedCredits, reposts: userReposts });
            transaction.update(ownerRef, { credits: newCredits });

            return Promise.resolve();
        })
        .then(() => {
            alert("✅ Reposted successfully! You earned 10 credits.");
            updateDashboard(user);
        })
        .catch(error => console.error("Error reposting:", error));
    }
}
