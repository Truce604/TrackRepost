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

    // ✅ FIX: Ensure campaigns load correctly with SoundCloud data
    window.loadActiveCampaigns = function () {
        const campaignsDiv = document.getElementById("activeCampaigns");
        if (!campaignsDiv) {
            console.error("❌ Campaigns section not found");
            return;
        }

        campaignsDiv.innerHTML = "<p>Loading...</p>";

        db.collection("campaigns").get()
            .then(async (querySnapshot) => {
                console.log(`🔍 Found ${querySnapshot.size} campaigns in Firestore`);
                campaignsDiv.innerHTML = "";

                if (querySnapshot.empty) {
                    campaignsDiv.innerHTML = "<p>No active campaigns available.</p>";
                } else {
                    for (const doc of querySnapshot.docs) {
                        let data = doc.data();
                        console.log("🎵 Campaign Data:", data);

                        let trackTitle = "Unknown Track";
                        let artistName = "Unknown Artist";

                        try {
                            const response = await fetch(`https://api.soundcloud.com/resolve?url=${data.track}&client_id=YOUR_SOUNDCLOUD_CLIENT_ID`);
                            const trackInfo = await response.json();
                            if (trackInfo && trackInfo.title) {
                                trackTitle = trackInfo.title;
                                artistName = trackInfo.user ? trackInfo.user.username : "Unknown Artist";
                            }
                        } catch (error) {
                            console.error("❌ Error fetching SoundCloud track info:", error);
                        }

                        campaignsDiv.innerHTML += `
                            <div id="campaign-${doc.id}">
                                <p><strong>${trackTitle}</strong> by ${artistName}</p>
                                <iframe loading="lazy" width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                    src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                                </iframe>
                                <button onclick="repostTrack('${doc.id}', '${data.owner}', '${data.credits}', '${data.track}')">Repost</button>
                            </div>
                        `;
                    }
                }
            })
            .catch(error => console.error("❌ Error loading campaigns:", error));
    };

    // ✅ FIX: Define updateDashboard function
    window.updateDashboard = function (user) {
        const dashboard = document.getElementById("userDashboard");
        const authMessage = document.getElementById("authMessage");

        if (!dashboard || !authMessage) {
            console.error("❌ Dashboard elements not found.");
            return;
        }

        if (!user) {
            dashboard.innerHTML = `<h2>You are not logged in.</h2><p>Please log in or sign up.</p>`;
            authMessage.innerText = "";
            return;
        }

        db.collection("users").doc(user.uid).get().then(doc => {
            if (doc.exists) {
                let data = doc.data();
                dashboard.innerHTML = `
                    <h2>Welcome, ${user.email}!</h2>
                    <p>Reposts: <span id="repostCount">${data.reposts || 0}</span></p>
                    <p>Credits: <span id="creditCount">${data.credits || 0}</span></p>
                    <button onclick="logoutUser()">Logout</button>
                `;
                authMessage.innerText = "✅ Logged in successfully!";
            } else {
                console.warn("🚨 User data not found in Firestore!");
            }
        }).catch(error => {
            console.error("❌ Error loading user data:", error);
        });
    };
}
