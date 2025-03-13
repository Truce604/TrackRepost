// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check your script imports.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Ensure Firebase Config is Loaded BEFORE Initializing
const script = document.createElement("script");
script.src = "firebaseConfig.js"; // ✅ Make sure this path is correct
script.onload = () => {
    console.log("✅ Firebase Config Loaded Successfully!");

    // ✅ Firebase Services
    const auth = firebase.auth();
    const db = firebase.firestore();

    // ✅ Listen for Auth Changes
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log(`✅ User logged in: ${user.email}`);
            document.getElementById("logoutBtn").style.display = "block";
            updateDashboard(user);
            loadActiveCampaigns();
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
                            <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay



