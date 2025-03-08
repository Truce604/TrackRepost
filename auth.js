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
    auth.onAuthStateChanged(async user => {
        if (user) {
            console.log("✅ User detected:", user.email);
            try {
                await user.reload();
                console.log("🔄 Session refreshed:", user.email);
                updateDashboard(user);
            } catch (error) {
                console.error("❌ Session refresh error:", error);
            }
        } else {
            console.warn("🚨 No user detected. Checking session...");
            auth.getRedirectResult()
                .then(result => {
                    if (result.user) {
                        console.log("✅ Restored session:", result.user.email);
                        updateDashboard(result.user);
                    } else {
                        updateDashboard(null);
                    }
                })
                .catch(error => {
                    console.error("❌ Error retrieving session:", error);
                });
        }
    });

    // ✅ Ensure Functions are Globally Accessible
    window.signupUser = function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

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
}

