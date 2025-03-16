// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check index.html script imports.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Firebase Authentication and Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Square Payment Integration
async function processPayment(amount) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to purchase credits.");
        return;
    }

    try {
        const response = await fetch("/api/create-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                amount: amount,
                userId: user.uid
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(`✅ Payment Successful! You received ${data.credits} credits.`);
            updateCreditsDisplay(data.credits);
        } else {
            alert(`❌ Payment Failed: ${data.error}`);
        }
    } catch (error) {
        console.error("❌ Payment Error:", error);
        alert("❌ An error occurred while processing your payment.");
    }
}

// ✅ Update Credits Display
function updateCreditsDisplay(credits) {
    const creditsDisplay = document.getElementById("userCredits");
    if (creditsDisplay) {
        creditsDisplay.textContent = `Your Credits: ${credits}`;
    }
}

// ✅ Display Current User Credits
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log(`✅ User logged in: ${user.email}`);

        const userRef = db.collection("users").doc(user.uid);
        const doc = await userRef.get();

        if (doc.exists) {
            updateCreditsDisplay(doc.data().credits || 0);
        } else {
            updateCreditsDisplay(0);
        }
    } else {
        console.warn("🚨 No user logged in.");
        updateCreditsDisplay("N/A");
    }
});

// ✅ Attach Event Listeners to Payment Buttons
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Subscribe Page Loaded Successfully!");

    document.getElementById("buy5Btn").addEventListener("click", () => processPayment(5));
    document.getElementById("buy10Btn").addEventListener("click", () => processPayment(10));
    document.getElementById("buy20Btn").addEventListener("click", () => processPayment(20));
    document.getElementById("buy50Btn").addEventListener("click", () => processPayment(50));
});
