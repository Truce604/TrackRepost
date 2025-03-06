// ✅ Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw",
    authDomain: "trackrepost-921f8.firebaseapp.com",
    projectId: "trackrepost-921f8",
    storageBucket: "trackrepost-921f8.appspot.com",
    messagingSenderId: "967836604288",
    appId: "1:967836604288:web:3782d50de7384c9201d365",
    measurementId: "G-G65Q3HC3R8"
};

// ✅ Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ SIGNUP FUNCTION
window.signupUser = function () {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            alert("Signup Successful! Welcome " + userCredential.user.email);
        })
        .catch((error) => {
            alert("Signup Error: " + error.message);
            console.error("Signup Error:", error);
        });
};

// ✅ LOGIN FUNCTION
window.loginUser = function () {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            alert("Login Successful! Welcome " + userCredential.user.email);
        })
        .catch((error) => {
            alert("Login Error: " + error.message);
            console.error("Login Error:", error);
        });
};

// ✅ LOGOUT FUNCTION
window.logoutUser = function () {
    auth.signOut()
        .then(() => {
            alert("Logged Out!");
        })
        .catch((error) => {
            alert("Logout Error: " + error.message);
            console.error("Logout Error:", error);
        });
};
