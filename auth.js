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
        const trackMessage = document.getElementById("currentTrackMessage");
        const soundcloudSection = document.getElementById("soundcloudSection");

        if (!user) {
            dashboard.innerHTML = `<h2>You are not logged in.</h2><p>Please log in or sign up.</p>`;
            trackMessage.innerHTML = "No active campaign";
            soundcloudSection.style.display = "none";
            return;
        }

        soundcloudSection.style.display = "block";

        // ✅ Fetch user data from Firestore
        db.collection("users").doc(user.uid).onSnapshot((doc) => {
            if (doc.exists) {
                let data = doc.data();
                dashboard.innerHTML = `
                    <h2>Welcome, ${user.email}!</h2>
                    <p>Reposts: <span id="repostCount">${data.reposts || 0}</span></p>
                    <p>Credits: <span id="creditCount">${data.credits || 0}</span></p>
                    <button onclick="logoutUser()">Logout</button>
                `;

                if (data.trackUrl) {
                    displayTrackInfo(data.trackUrl);
                } else {
                    trackMessage.innerHTML = "No active campaign";
                }
            } else {
                console.error("User data missing in Firestore.");
            }
        });
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
                db.collection("users").doc(user.uid).set({
                    email: user.email,
                    credits: 0,
                    reposts: 0,
                    trackUrl: ""
                }).then(() => {
                    alert("✅ Signup Successful! Welcome " + user.email);
                    updateDashboard(user);
                }).catch(error => console.error("Error saving user:", error));
            })
            .catch((error) => {
                alert("❌ Signup Error: " + error.message);
                console.error("Signup Error:", error);
            });
    };

    // ✅ LOGIN FUNCTION
    window.loginUser = function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                alert("✅ Login Successful! Welcome " + userCredential.user.email);
                updateDashboard(userCredential.user);
            })
            .catch((error) => {
                alert("❌ Login Error: " + error.message);
                console.error("Login Error:", error);
            });
    };

    // ✅ LOGOUT FUNCTION
    window.logoutUser = function () {
        auth.signOut()
            .then(() => {
                alert("✅ Logged Out!");
                updateDashboard(null);
            })
            .catch((error) => {
                alert("❌ Logout Error: " + error.message);
                console.error("Logout Error:", error);
            });
    };

    // ✅ SUBMIT TRACK FUNCTION
    window.submitTrack = async function () {
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

        const userRef = db.collection("users").doc(user.uid);

        try {
            const userDoc = await userRef.get();
            if (userDoc.exists && userDoc.data().trackUrl) {
                alert("Free users can only run one campaign at a time. Upgrade to add more.");
                return;
            }

            await userRef.update({
                trackUrl: soundcloudUrl
            });

            displayTrackInfo(soundcloudUrl);
            alert("✅ SoundCloud track submitted successfully!");

        } catch (error) {
            console.error("Error updating track:", error);
            alert("Error submitting track. Try again.");
        }
    };

    // ✅ DISPLAY TRACK INFO WITH ARTWORK
    function displayTrackInfo(url) {
        const trackMessage = document.getElementById("currentTrackMessage");
        fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`)
            .then(response => response.json())
            .then(data => {
                trackMessage.innerHTML = `
                    <p>Your active campaign:</p>
                    <img src="${data.thumbnail_url}" alt="SoundCloud Artwork" style="width:100%; max-width:300px; border-radius:10px;">
                    <p><a href="${url}" target="_blank">${data.title}</a></p>
                `;
            })
            .catch(error => {
                console.error("Error fetching SoundCloud data:", error);
                trackMessage.innerHTML = "Error loading track artwork.";
            });
    }
}
