// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");

    const auth = firebase.auth();
    const db = firebase.firestore();

    // ✅ Set Firebase Auth Persistence
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            console.log("✅ Auth Persistence Set to LOCAL");
        })
        .catch(error => {
            console.error("❌ Error setting auth persistence:", error.message);
        });

    // ✅ LISTEN FOR AUTH CHANGES
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("✅ User is logged in:", user.email);
            updateDashboard(user);
        } else {
            console.warn("🚨 User is NOT logged in.");
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

        console.log("🔍 Attempting login...");
        console.log("📧 Email:", email);
        console.log("🔑 Password:", password ? "Entered" : "Not Entered");

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
}
