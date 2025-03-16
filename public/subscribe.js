async function processPayment(cardToken) {
    const response = await fetch("https://your-project.vercel.app/api/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            token: cardToken,
            amount: selectedAmount, // User-selected credit package
        }),
    });

    const data = await response.json();
    if (data.success) {
        console.log("✅ Payment Successful!");
        alert("Payment successful! Credits added.");
        updateUserCredits(data.credits);
    } else {
        console.error("❌ Payment Failed:", data.error);
        alert("Payment failed. Try again.");
    }
}

