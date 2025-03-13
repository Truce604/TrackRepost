// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Load Firebase Config (Ensure it loads before initialization)
function loadFirebaseConfig() {
    fetch("firebaseConfig.js")
        .then(response => response.text())
        .then(configText => {
            const config = eval(`(${configText})`);
            firebase.initializeApp(config);
            console.log("✅ Firebase Initialized Successfully!");
            initializeAuth();
        })
        .catch(error => console.error("🚨 Failed to load Firebase Config:", error));
}

// ✅ Initialize Firebase Auth AFTER Config Loads
function initializeAuth() {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // ✅ FUNCTION: UPDATE DASHBOARD
    window.updateDashboard = function (user) {
        const dashboard = document.getElementById("userDashboard");

        if (!dashboard) {
            console.error("❌ Dashboard element not found.");
            return;
        }

        if (!user) {
            dashboard.innerHTML = `<h2>You are not logged in.</h2><p>Please log in or sign up.</p>`;
            return;
        }

        db.collection("users").doc(user.uid).onSnapshot(doc => {
            if (doc.exists) {
                let data = doc.data();
                dashboard.innerHTML = `
                    <h2>Welcome, ${user.email}!</h2>
                    <p>Reposts: <span id="repostCount">${data.reposts || 0}</span></p>
                    <p>Credits: <span id="creditCount">${data.credits || 0}</span></p>
                `;
            } else {
                console.warn("⚠️ No user data found.");
            }
        });
    };

    // ✅ Listen for Auth Changes
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log(`✅ User logged in: ${user.email}`);
            document.getElementById("logoutBtn").style.display = "block";
            updateDashboard(user);
            if (typeof loadActiveCampaigns === "function") {
                loadActiveCampaigns();
            }
        } else {
            console.warn("🚨 No user detected.");
            document.getElementById("logoutBtn").style.display = "none";
            updateDashboard(null);
        }
    });

    // ✅ LOGIN FUNCTION
    window.loginUser = function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                document.getElementById("authMessage").textContent = "✅ Login Successful!";
                updateDashboard(userCredential.user);
            })
            .catch(error => {
                console.error("❌ Login Error:", error);
                document.getElementById("authMessage").textContent = `❌ Login Error: ${error.message}`;
            });
    };

    // ✅ SIGNUP FUNCTION
    window.signupUser = function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                return db.collection("users").doc(userCredential.user.uid).set({
                    email: userCredential.user.email,
                    credits: 10,
                    reposts: 0
                });
            })
            .then(() => {
                document.getElementById("authMessage").textContent = "✅ Signup Successful!";
                updateDashboard(auth.currentUser);
            })
            .catch(error => {
                console.error("❌ Signup Error:", error);
                document.getElementById("authMessage").textContent = `❌ Signup Error: ${error.message}`;
            });
    };

    // ✅ LOGOUT FUNCTION
    window.logoutUser = function () {
        auth.signOut().then(() => {
            document.getElementById("authMessage").textContent = "✅ Logged out successfully!";
            updateDashboard(null);
        }).catch(error => {
            console.error("❌ Logout Error:", error);
            document.getElementById("authMessage").textContent = `❌ Logout Error: ${error.message}`;
        });
    };

    // ✅ FUNCTION: SUBMIT A NEW TRACK
    window.submitTrack = function () {
        const user = auth.currentUser;
        if (!user) {
            alert("🚨 You must be logged in to submit a track.");
            return;
        }

        let soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();
        if (!soundcloudUrl.includes("soundcloud.com/")) {
            alert("🚨 Invalid SoundCloud URL.");
            return;
        }

        db.collection("campaigns").add({
            owner: user.uid,
            track: soundcloudUrl,
            credits: 10,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            alert("✅ Track successfully submitted!");
            if (typeof loadActiveCampaigns === "function") {
                loadActiveCampaigns();
            }
        }).catch(error => {
            console.error("❌ Error submitting track:", error);
            alert("❌ Error submitting track: " + error.message);
        });
    };

    // ✅ FUNCTION: LOAD ACTIVE CAMPAIGNS
    window.loadActiveCampaigns = function () {
        const campaignsDiv = document.getElementById("activeCampaigns");
        if (!campaignsDiv) {
            console.error("❌ Campaigns section not found");
            return;
        }

        campaignsDiv.innerHTML = "<p>⏳ Loading campaigns...</p>";

        db.collection("campaigns").orderBy("timestamp", "desc").onSnapshot(snapshot => {
            campaignsDiv.innerHTML = "";

            if (snapshot.empty) {
                campaignsDiv.innerHTML = "<p>No active campaigns available.</p>";
            } else {
                snapshot.forEach(doc => {
                    let data = doc.data();
                    campaignsDiv.innerHTML += `
                        <div id="campaign-${doc.id}" class="campaign">
                            <h3>🔥 Now Promoting:</h3>
                            <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                            </iframe>
                            <button onclick="repostTrack('${doc.id}', '${data.owner}', '${data.credits}')">Repost & Earn Credits</button>
                        </div>
                    `;
                });
            }
        });
    };

    // ✅ AUTOLOAD CAMPAIGNS ON PAGE LOAD
    document.addEventListener("DOMContentLoaded", () => {
        if (typeof loadActiveCampaigns === "function") {
            loadActiveCampaigns();
        }
    });
}

// ✅ Load Firebase Config and Start Initialization
loadFirebaseConfig();

