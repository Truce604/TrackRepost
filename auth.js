// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");

    const auth = firebase.auth();
    const db = firebase.firestore();

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
                    <button id="logoutBtn">Logout</button>
                `;

                if (data.track) {
                    document.getElementById("currentTrackMessage").innerHTML = `
                        <p>Active Campaign:</p>
                        <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                            src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                        </iframe>
                    `;
                } else {
                    document.getElementById("currentTrackMessage").innerText = "No active campaign";
                }
            }
        });

        // Load all active campaigns
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

    // ✅ SUBMIT TRACK FUNCTION
    function submitTrack() {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to submit a track.");
            return;
        }

        let soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();

        if (soundcloudUrl.includes("on.soundcloud.com")) {
            alert("❌ Invalid SoundCloud URL. Please paste the FULL track URL.");
            return;
        }

        db.collection("users").doc(user.uid).get()
            .then((doc) => {
                if (doc.exists && doc.data().credits > 0) {
                    db.collection("campaigns").doc(user.uid).set({
                        userId: user.uid,
                        email: user.email,
                        track: soundcloudUrl,
                        credits: doc.data().credits
                    }).then(() => {
                        alert("✅ Track submitted as a campaign!");
                        loadActiveCampaigns();
                    });
                } else {
                    alert("❌ You need credits to start a campaign.");
                }
            });
    }

    // ✅ LOAD ACTIVE CAMPAIGNS
    function loadActiveCampaigns() {
        const campaignsDiv = document.getElementById("activeCampaigns");
        campaignsDiv.innerHTML = "<p>Loading...</p>";

        db.collection("campaigns").where("credits", ">", 0).get()
            .then(querySnapshot => {
                campaignsDiv.innerHTML = "";
                if (querySnapshot.empty) {
                    campaignsDiv.innerHTML = "<p>No active campaigns.</p>";
                    return;
                }

                querySnapshot.forEach(doc => {
                    let data = doc.data();
                    if (data.track) {
                        campaignsDiv.innerHTML += `
                            <div class="campaign">
                                <p>${data.email} is promoting:</p>
                                <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                    src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                                </iframe>
                                <button onclick="repostTrack('${doc.id}')">Repost & Earn Credits</button>
                            </div>
                        `;
                    }
                });
            })
            .catch(error => {
                console.error("Error loading campaigns:", error);
                campaignsDiv.innerHTML = "<p>Error loading campaigns.</p>";
            });
    }

    // ✅ REPOST FUNCTION - Earn Credits
    function repostTrack(campaignId) {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to repost and earn credits.");
            return;
        }

        const campaignRef = db.collection("campaigns").doc(campaignId);
        const userRef = db.collection("users").doc(user.uid);

        db.runTransaction(async (transaction) => {
            const campaignDoc = await transaction.get(campaignRef);
            const userDoc = await transaction.get(userRef);

            if (!campaignDoc.exists || campaignDoc.data().credits <= 0) {
                alert("❌ This campaign is no longer available.");
                return;
            }

            let campaignData = campaignDoc.data();
            let userData = userDoc.data();

            transaction.update(campaignRef, { credits: campaignData.credits - 10 });
            transaction.update(userRef, { credits: (userData.credits || 0) + 10 });

            alert("✅ Repost successful! You earned 10 credits.");
        }).then(() => loadActiveCampaigns());
    }
}
