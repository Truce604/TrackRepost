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

    // ✅ Determine the number of credits based on price
    let credits = 0;
    if (amount === 24.99) credits = 500;
    else if (amount === 34.99) credits = 1000;
    else if (amount === 79.99) credits = 2500;
    else if (amount === 139.99) credits = 5000;
    else if (amount === 549.99) credits = 25000;
    else {
        alert("❌ Invalid credit package selected.");
        return;
    }

    try {
        // ✅ Create Payment Intent (Call Server)
        const response = await fetch('/api/square/checkout', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: amount,
                credits: credits,
                userId: user.uid
            })
        });

        // ✅ Check if the response is valid JSON
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        if (!data || !data.checkoutUrl) {
            throw new Error("Invalid response from server.");
        }

        // ✅ Redirect to Square Checkout Page
        console.log("✅ Redirecting to Square Checkout:", data.checkoutUrl);
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
            const amount = parseFloat(event.target.getAttribute("data-amount")); // Ensure float for price
            processPayment(amount);
        });
    });
});


