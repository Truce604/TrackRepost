async function processPayment(amount, credits) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to buy credits.");
        return;
    }

    console.log(`🔄 Processing payment for ${credits} credits...`);

    try {
        const response = await fetch("https://trackrepost.com/api/square/checkout", {
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

        const data = await response.json();
        if (!data || !data.checkoutUrl) {
            throw new Error("Invalid response from server.");
        }

        console.log("✅ Redirecting to Square:", data.checkoutUrl);

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
            const amount = parseFloat(event.target.getAttribute("data-amount"));
            const credits = parseInt(event.target.getAttribute("data-credits"));
            processPayment(amount, credits);
        });
    });
});


