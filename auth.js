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

        // Fetch user data from Firestore in real-time
        db.collection("users").doc(user.uid).onSnapshot((doc) => {
            if (doc.exists) {
                let data = doc.data();
                dashboard.innerHTML = `
                    <h2>Welcome, ${user.email}!</h2>
                    <p>Reposts: <span id="repostCount">${data.reposts || 0}</span></p>
                    <p>Credits: <span id="creditCount">${data.credits || 0}</span></p>
                    <button id="logoutBtn">Logout</button>
                `;

                authMessage.innerText = "✅ Logged in successfully!";

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

    // ✅ SUBMIT TRACK FUNCTION - Validates & Saves SoundCloud Track
    function submitTrack() {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to submit a track.");
            return;
        }

        let soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();
        
        // Validate SoundCloud URL
        if (!soundcloudUrl.match(/^(https:\/\/)?(www\.)?(m\.)?soundcloud\.com\/.+/)) {
            alert("❌ Invalid SoundCloud URL. Please enter a valid SoundCloud track link.");
            return;
        }

        // Save to Firestore
        db.collection("users").doc(user.uid).update({ track: soundcloudUrl })
            .then(() => {
                alert("✅ Track submitted!");
                loadActiveCampaigns();
            })
            .catch(error => {
                console.error("Error saving track:", error);
                alert("❌ Error submitting track.");
            });
    }

    // ✅ LOAD ACTIVE CAMPAIGNS - Display Public SoundCloud Tracks
    function loadActiveCampaigns() {
        const campaignsDiv = document.getElementById("activeCampaigns");
        campaignsDiv.innerHTML = "<p>Loading...</p>";

        db.collection("users").where("track", "!=", null).get()
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
}
