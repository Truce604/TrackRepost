// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Ensure Firebase Config is Loaded Before Initialization
document.addEventListener("DOMContentLoaded", function () {
    if (typeof firebaseConfig === "undefined") {
        console.error("🚨 Firebase config is missing! Ensure firebaseConfig.js is properly linked in index.html.");
        return;
    }

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("✅ Firebase Initialized Successfully!");
    }

    const auth = firebase.auth();
    const db = firebase.firestore();

    // ✅ LOGIN FUNCTION
    window.loginUser = function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log(`✅ User logged in: ${userCredential.user.email}`);
                document.getElementById("authMessage").textContent = "✅ Login Successful!";
                loadActiveCampaigns();
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
                console.log(`✅ User signed up: ${userCredential.user.email}`);
                document.getElementById("authMessage").textContent = "✅ Signup Successful!";
            })
            .catch(error => {
                console.error("❌ Signup Error:", error);
                document.getElementById("authMessage").textContent = `❌ Signup Error: ${error.message}`;
            });
    };

    // ✅ LOGOUT FUNCTION
    window.logoutUser = function () {
        auth.signOut().then(() => {
            console.log("✅ User logged out.");
            document.getElementById("authMessage").textContent = "✅ Logged out successfully!";
        }).catch(error => {
            console.error("❌ Logout Error:", error);
        });
    };

    // ✅ AUTOLOAD CAMPAIGNS (Ensure Firebase is Ready)
    window.loadActiveCampaigns = function () {
        console.log("🔄 Loading campaigns...");
        const campaignsDiv = document.getElementById("activeCampaigns");

        if (!campaignsDiv) {
            console.error("❌ Campaigns section not found.");
            return;
        }

        db.collection("campaigns").orderBy("timestamp", "desc").onSnapshot(snapshot => {
            campaignsDiv.innerHTML = "";

            if (snapshot.empty) {
                campaignsDiv.innerHTML = "<p>No active campaigns available.</p>";
            } else {
                snapshot.forEach(doc => {
                    let data = doc.data();
                    campaignsDiv.innerHTML += `
                        <div class="campaign">
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

    // ✅ Ensure Campaigns Load When the Page Loads
    loadActiveCampaigns();
});



