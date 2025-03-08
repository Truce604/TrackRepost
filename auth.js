if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");

    const auth = firebase.auth();
    const db = firebase.firestore();

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

                // ✅ Show Active SoundCloud Campaign
                if (data.track) {
                    document.getElementById("trackTitle").innerText = data.track.title;
                    document.getElementById("trackArtwork").src = data.track.artwork;
                    document.getElementById("trackArtwork").style.display = "block";
                }
            } else {
                console.error("User data missing in Firestore.");
            }
        });
    }

    auth.onAuthStateChanged(updateDashboard);

    window.signupUser = function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                db.collection("users").doc(user.uid).set({
                    email: user.email,
                    credits: 0,
                    reposts: 0
                });
                alert("✅ Signup Successful! Welcome " + user.email);
                updateDashboard(user);
            })
            .catch((error) => alert("❌ Signup Error: " + error.message));
    };

    window.loginUser = function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                alert("✅ Login Successful! Welcome " + userCredential.user.email);
                updateDashboard(userCredential.user);
            })
            .catch((error) => alert("❌ Login Error: " + error.message));
    };

    window.logoutUser = function () {
        auth.signOut().then(() => {
            alert("✅ Logged Out!");
            updateDashboard(null);
        }).catch((error) => alert("❌ Logout Error: " + error.message));
    };

    window.submitTrack = async function () {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to submit a track.");
            return;
        }

        const soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();
        if (!soundcloudUrl.includes("soundcloud.com")) {
            alert("Please enter a valid SoundCloud URL.");
            return;
        }

        try {
            let response = await fetch(`https://soundcloud.com/oembed?format=json&url=${soundcloudUrl}`);
            let data = await response.json();

            const trackInfo = {
                title: data.title,
                artwork: data.thumbnail_url,
                url: soundcloudUrl
            };

            await db.collection("users").doc(user.uid).update({ track: trackInfo });

            document.getElementById("trackTitle").innerText = trackInfo.title;
            document.getElementById("trackArtwork").src = trackInfo.artwork;
            document.getElementById("trackArtwork").style.display = "block";

            alert("✅ SoundCloud Track Submitted!");
        } catch (error) {
            alert("❌ Error fetching track details. Please try again.");
        }
    };
}
