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
        if (!user) {
            dashboard.innerHTML = `<h2>You are not logged in.</h2><p>Please log in or sign up.</p>`;
            return;
        }

        db.collection("users").doc(user.uid).onSnapshot((doc) => {
            if (doc.exists) {
                let data = doc.data();
                dashboard.innerHTML = `
                    <h2>Welcome, ${user.email}!</h2>
                    <p>Reposts: <span id="repostCount">${data.reposts || 0}</span></p>
                    <p>Credits: <span id="creditCount">${data.credits || 0}</span></p>
                    <button onclick="logoutUser()">Logout</button>
                `;
                loadActiveCampaigns();
            }
        });
    }

    auth.onAuthStateChanged(updateDashboard);

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

    function logoutUser() {
        auth.signOut().then(() => {
            alert("✅ Logged Out!");
            updateDashboard(null);
        });
    }

    function submitTrack() {
        const user = auth.currentUser;
        if (!user) return alert("Login to submit a track.");

        let soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();
        if (!soundcloudUrl.includes("soundcloud.com/")) return alert("Invalid SoundCloud URL.");

        db.collection("campaigns").doc(user.uid).set({ track: soundcloudUrl, owner: user.uid })
            .then(() => alert("✅ Track submitted!"));
    }
}
