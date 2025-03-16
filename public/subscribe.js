// ✅ Ensure Firebase is loaded before running scripts 
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check index.html script imports.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Check if the user is logged in
auth.onAuthStateChanged(user => {
    if (user) {
        console.log(`✅ User logged in: ${user.email}`);
        loadUserCredits(user.uid);
    } else {
        console.warn("🚨 No user is logged in. Redirecting...");
        window.location.href = "index.html"; // Redirect to login page if not logged in
    }
});

// ✅ Function to load user's credits from Firestore
function loadUserCredits(userId) {
    const creditsDisplay = document.getElementById("userCredits");

    db.collection("users").doc(userId).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                const credits = userData.credits || 0;
                creditsDisplay.innerHTML = `<strong>Your Credits:</strong> ${credits}`;
                console.log(`✅ User credits loaded: ${credits}`);
            } else {
                console.warn("🚨 User document not found.");
                creditsDisplay.innerHTML = `<strong>Your Credits:</strong> 0`;
            }
        })
        .catch(error => {
            console.error("❌ Error loading user credits:", error);
        });
}

// ✅ Attach event listeners to subscription buttons
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("buy10Credits").addEventListener("click", () => buyCredits(10));
    document.getElementById("buy50Credits").addEventListener("click", () => buyCredits(50));
    document.getElementById("buy100Credits").addEventListener("click", () => buyCredits(100));
});

// ✅ Function to handle buying credits (Placeholder for Square Integration)
function buyCredits(amount) {
    alert(`✅ Redirecting to Square for purchasing ${amount} credits...`);
    // 🔹 TODO: Integrate Square payment and add credits to Firestore after payment is successful.
}
