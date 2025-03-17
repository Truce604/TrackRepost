// ✅ Ensure Firebase is loaded before running scripts
if (!window.auth || !window.db) {
    console.error("🚨 Firebase is not properly initialized! Check firebaseConfig.js.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

const auth = window.auth;
const db = window.db;

// ✅ Square Payment Handler
async function processPayment(amount) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to buy credits.");
        return;
    }

    console.log(`🔄 Processing payment for ${amount} credits...`);

    try {
        // ✅ Create Payment Intent (Call Server)
        const response = await fetch('/api/square/checkout', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: amount,
                userId: user.uid
            })
        });

        const data = await response.json();
        if (!data || !data.checkoutUrl) {
            throw new Error("Invalid response from server.");
        }

        // ✅ Redirect to Square Checkout Page
        window.location.href = data.checkoutUrl;

    } catch (error) {
        console.error("❌ Payment Error:", error);
        alert(`Payment failed: ${error.message}`);
    }
}

// ✅ Attach Event Listeners to Buttons
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Subscribe Page Loaded Successfully!");

    document.querySelectorAll(".buy-credit").forEach(button => {
        button.addEventListener("click", (event) => {
            const amount = parseInt(event.target.getAttribute("data-amount"));
            processPayment(amount);
        });
    });
});


