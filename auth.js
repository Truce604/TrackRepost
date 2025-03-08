// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");

    const auth = firebase.auth();
    const db = firebase.firestore();

    // ✅ LISTEN FOR AUTH CHANGES
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("✅ User is logged in:", user.email);
            updateDashboard(user);
        } else {
            console.log("🚨 No user logged in.");
            updateDashboard(null);
        }
    });

    // ✅ SIGNUP FUNCTION
    function signupUser() {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                const user = userCredential.user;
                return db.collection("users").doc(user.uid).set({
                    email: user.email,
                    credits: 0,
                    reposts: 0
                });
            })
            .then(() => {
                alert("✅ Signup Successful!");
                updateDashboard(auth.currentUser);
            })
            .catch(error => {
                console.error("❌ Signup Error:", error);
                alert("❌ Signup Error: " + error.message);
            });
    }

    // ✅ LOGIN FUNCTION
    function loginUser() {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        console.log("Attempting login with:", email);

        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log("✅ Login Successful:", userCredential);
                alert("✅ Login Successful!");
                updateDashboard(userCredential.user);
            })
            .catch(error => {
                console.error("❌ Login Error:", error.code, error.message);
                alert("❌ Login Error: " + error.message);
            });
    }

    // ✅ LOGOUT FUNCTION
    function logoutUser() {
        auth.signOut()
            .then(() => {
                alert("✅ Logged Out!");
                updateDashboard(null);
            })
            .catch(error => {
                console.error("❌ Logout Error:", error);
                alert("❌ Logout Error: " + error.message);
            });
    }

    // ✅ UPDATE DASHBOARD FUNCTION
    function updateDashboard(user) {
        const dashboard = document.getElementById("userDashboard");
        const authMessage = document.getElementById("authMessage");

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
    }

    // ✅ SUBMIT TRACK FUNCTION
    function submitTrack() {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to submit a track.");
            return;
        }

        let soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();
        if (!soundcloudUrl.includes("soundcloud.com/")) {
            alert("Invalid SoundCloud URL.");
            return;
        }

        db.collection("campaigns").add({
            owner: user.uid,
            track: soundcloudUrl,
            credits: 10
        }).then(() => {
            alert("✅ Track submitted!");
        }).catch(error => {
            console.error("Error submitting track:", error);
        });
    }

    // ✅ LOAD ACTIVE CAMPAIGNS
    function loadActiveCampaigns() {
        const campaignsDiv = document.getElementById("activeCampaigns");
        campaignsDiv.innerHTML = "<p>Loading...</p>";

        db.collection("campaigns").get()
            .then(querySnapshot => {
                campaignsDiv.innerHTML = "";
                querySnapshot.forEach(doc => {
                    let data = doc.data();
                    campaignsDiv.innerHTML += `
                        <div>
                            <p>Track from ${data.owner}:</p>
                            <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                            </iframe>
                            <button onclick="repostTrack('${doc.id}', '${data.owner}', ${data.credits})">Repost</button>
                        </div>
                    `;
                });
            }).catch(error => console.error("Error loading campaigns:", error));
    }

    // ✅ REPOST FUNCTION
    function repostTrack(campaignId, campaignOwner, campaignCredits) {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to repost.");
            return;
        }

        if (user.uid === campaignOwner) {
            alert("You cannot repost your own campaign.");
            return;
        }

        db.runTransaction(async (transaction) => {
            const userRef = db.collection("users").doc(user.uid);
            const ownerRef = db.collection("users").doc(campaignOwner);

            const userDoc = await transaction.get(userRef);
            const ownerDoc = await transaction.get(ownerRef);

            if (!userDoc.exists || !ownerDoc.exists) {
                throw new Error("User data not found!");
            }

            let newCredits = ownerDoc.data().credits - 10;
            let userEarnedCredits = userDoc.data().credits + 10;
            let userReposts = (userDoc.data().reposts || 0) + 1;

            transaction.update(userRef, { credits: userEarnedCredits, reposts: userReposts });
            transaction.update(ownerRef, { credits: newCredits });

            return Promise.resolve();
        })
        .then(() => {
            alert("✅ Reposted successfully! You earned 10 credits.");
            updateDashboard(user);
        })
        .catch(error => console.error("Error reposting:", error));
    }
}
