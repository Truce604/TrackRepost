document.addEventListener("DOMContentLoaded", async function () {
    console.log("✅ Square Payment Page Loaded");

    const applicationId = "YOUR_SQUARE_APPLICATION_ID"; // 🔹 Replace with your actual Square App ID
    const locationId = "YOUR_SQUARE_LOCATION_ID"; // 🔹 Replace with your Square Location ID

    if (!window.Square) {
        console.error("🚨 Square.js SDK failed to load!");
        return;
    }

    let payments;
    try {
        payments = window.Square.payments(applicationId, locationId);
    } catch (e) {
        console.error("🚨 Failed to initialize Square Payments:", e);
        return;
    }

    // ✅ Create Card Payment Form
    async function createCardPayment() {
        const card = await payments.card();
        await card.attach("#payment-container");

        document.getElementById("buyCreditsBtn").addEventListener("click", async function () {
            console.log("💳 Processing Payment...");

            try {
                const result = await card.tokenize();
                if (result.status === "OK") {
                    console.log("✅ Payment Successful, Token:", result.token);
                    alert("Payment successful! Credits will be added to your account.");

                    // 🔹 Send payment token to Firebase Function (next step)
                } else {
                    console.error("❌ Payment Failed:", result.errors);
                    alert("Payment failed. Please try again.");
                }
            } catch (error) {
                console.error("❌ Error Processing Payment:", error);
                alert("An error occurred during payment. Please try again.");
            }
        });
    }

    // ✅ Initialize the payment form
    createCardPayment();
});
