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

    // ✅ Listen for Authentication Changes
    auth.onAuthStateChanged(updateDashboard);

    // ✅ SUBMIT TRACK FUNCTION
    window.submitTrack = function () {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to submit a track.");
            return;
        }

        let soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();

        // ✅ Ensure URL is in correct format
        if (!soundcloudUrl.includes("soundcloud.com/")) {
            alert("Invalid SoundCloud URL. Example: https://soundcloud.com/artist/track");
            return;
        }

        db.collection("users").doc(user.uid).update({ track: soundcloudUrl })
            .then(() => {
                alert("✅ Track submitted!");
                loadActiveCampaigns();
            })
            .catch(error => console.error("Error submitting track:", error));
    };

    // ✅ LOAD ACTIVE CAMPAIGNS
    function loadActiveCampaigns() {
        const campaignsDiv = document.getElementById("activeCampaigns");
        campaignsDiv.innerHTML = "<p>Loading...</p>";

        db.collection("users").where("track", "!=", null).get()
            .then(querySnapshot => {
                campaignsDiv.innerHTML = "";
                querySnapshot.forEach(doc => {
                    let data = doc.data();
                    campaignsDiv.innerHTML += `
                        <div class="campaign">
                            <p><strong>${data.email}</strong> is promoting:</p>
                            <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                            </iframe>
                            <button onclick="repostTrack('${doc.id}')">Repost & Earn Credits</button>
                        </div>
                    `;
                });
            })
            .catch(error => console.error("Error loading campaigns:", error));
    }

    // ✅ REPOST FUNCTION
    window.repostTrack = function (userId) {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to repost.");
            return;
        }

        const userRef = db.collection("users").doc(user.uid);

        userRef.get().then(userDoc => {
            if (userDoc.exists) {
                let userData = userDoc.data();
                let newCredits = (userData.credits || 0) + 10;

                return userRef.update({ credits: newCredits });
            }
        }).then(() => {
            alert("✅ Reposted! You earned 10 credits.");
        }).catch(error => console.error("Error reposting:", error));
    };
}
