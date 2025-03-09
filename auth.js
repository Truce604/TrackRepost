// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");

    const auth = firebase.auth();
    const db = firebase.firestore();

    // ✅ Enable Firestore Offline Mode for Faster Performance
    db.enablePersistence()
        .then(() => console.log("✅ Firestore offline mode enabled"))
        .catch(error => console.warn("⚠️ Firestore persistence error:", error));

    // ✅ Set Firebase Auth Persistence
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            console.log("✅ Auth Persistence Set to LOCAL");
        })
        .catch(error => {
            console.error("❌ Error setting auth persistence:", error.message);
        });

    // ✅ LISTEN FOR AUTH CHANGES WITH SESSION CHECK
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("✅ User detected:", user.email);
            updateDashboard(user);
            loadActiveCampaigns(); // ✅ Ensure campaigns load when user logs in
        } else {
            console.warn("🚨 No user detected.");
            updateDashboard(null);
        }
    });

    // ✅ Ensure Functions are Globally Accessible
    window.signupUser = function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        console.log("📧 Signing up user:", email);

        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                return db.collection("users").doc(userCredential.user.uid).set({
                    email: userCredential.user.email,
                    credits: 0,
                    reposts: 0
                });
            })
            .then(() => {
                alert("✅ Signup Successful!");
                updateDashboard(auth.currentUser);
                loadActiveCampaigns();
            })
            .catch(error => {
                console.error("❌ Signup Error:", error);
                alert("❌ Signup Error: " + error.message);
            });
    };

    window.loginUser = function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        console.log("🔍 Attempting login...");
        console.log("📧 Email:", email);
        console.log("🔑 Password:", password ? "Entered" : "Not Entered");

        if (!email || !password) {
            console.error("❌ Missing email or password");
            alert("❌ Please enter both email and password");
            return;
        }

        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log("✅ Login Successful:", userCredential);
                alert("✅ Login Successful!");
                updateDashboard(userCredential.user);
                loadActiveCampaigns(); // ✅ Reload campaigns on login
            })
            .catch(error => {
                console.error("❌ Login Error:", error.code, error.message);
                alert("❌ Login Error: " + error.message);
            });
    };

    window.logoutUser = function () {
        auth.signOut()
            .then(() => {
                alert("✅ Logged Out!");
                updateDashboard(null);
            })
            .catch(error => {
                console.error("❌ Logout Error:", error);
                alert("❌ Logout Error: " + error.message);
            });
    };

    // ✅ CONNECT TO SOUNDCLOUD
    window.connectSoundCloud = function () {
        const clientId = "YOUR_SOUNDCLOUD_CLIENT_ID";
        const redirectUri = encodeURIComponent(window.location.href);
        window.location.href = `https://soundcloud.com/connect?client_id=${clientId}&response_type=token&scope=non-expiring&redirect_uri=${redirectUri}`;
    };

    window.extractSoundCloudToken = function () {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        if (accessToken) {
            localStorage.setItem("soundcloud_access_token", accessToken);
            console.log("✅ SoundCloud Access Token Stored!");
            alert("✅ SoundCloud Account Connected!");
        }
    };

    window.onload = function () {
        extractSoundCloudToken();
    };

    // ✅ REPOST TRACK TO SOUNDCLOUD
    window.repostTrack = async function (campaignId, campaignOwner, campaignCredits, trackUrl) {
        const user = auth.currentUser;
        if (!user) {
            alert("❌ You must be logged in to repost.");
            return;
        }

        if (user.uid === campaignOwner) {
            alert("❌ You cannot repost your own campaign.");
            return;
        }

        let accessToken = localStorage.getItem("soundcloud_access_token");
        if (!accessToken) {
            alert("❌ You need to connect your SoundCloud account.");
            connectSoundCloud();
            return;
        }

        let trackId;
        try {
            let response = await fetch(`https://api.soundcloud.com/resolve?url=${trackUrl}&client_id=YOUR_SOUNDCLOUD_CLIENT_ID`);
            let trackData = await response.json();
            trackId = trackData.id;
        } catch (error) {
            console.error("❌ Error fetching SoundCloud track ID:", error);
            alert("❌ Failed to find track on SoundCloud.");
            return;
        }

        try {
            let repostResponse = await fetch(`https://api.soundcloud.com/me/favorites/${trackId}?oauth_token=${accessToken}`, {
                method: "PUT"
            });

            if (repostResponse.ok) {
                alert("✅ Track reposted successfully!");
            } else {
                alert("❌ Failed to repost track on SoundCloud.");
            }
        } catch (error) {
            console.error("❌ Error reposting track:", error);
            alert(error.message);
        }
    };
}
