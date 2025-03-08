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
                return db.collection("users").doc(user.uid).set({
                    email: user.email,
                    credits: 0,
                    reposts: 0,
                    track: null
                });
            })
            .then(() => {
                alert("✅ Signup Successful!");
            })
            .catch(error => {
                alert("❌ Signup Error: " + error.message);
                console.error(error);
            });
    };

    // ✅ LOGIN FUNCTION
    window.loginUser = function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                alert("✅ Login Successful!");
            })
            .catch(error => {
                alert("❌ Login Error: " + error.message);
                console.error(error);
            });
    };

    // ✅ LOGOUT FUNCTION
    window.logoutUser = function () {
        auth.signOut()
            .then(() => {
                alert("✅ Logged Out!");
            })
            .catch(error => {
                alert("❌ Logout Error: " + error.message);
                console.error(error);
            });
    };

    // ✅ SUBMIT TRACK FUNCTION
    window.submitTrack = function () {
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
                            <a href="${data.track}" target="_blank">${data.track}</a>
                            <button onclick="repostTrack('${doc.id}', '${data.track}')">Repost & Earn Credits</button>
                        </div>
                    `;
                });
            })
            .catch(error => console.error("Error loading campaigns:", error));
    }
}
