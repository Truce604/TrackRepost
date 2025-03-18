async function processPayment(amount) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to buy credits.");
        return;
    }

    console.log(`🔄 Processing payment for $${amount}...`);

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
        const response = await fetch('/api/square/checkout', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: parseFloat(amount),
                credits: credits,
                userId: user.uid
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        if (!data || !data.checkoutUrl) {
            throw new Error("Invalid response from server.");
        }

        console.log("✅ Redirecting to Square Checkout:", data.checkoutUrl);
        window.location.href = data.checkoutUrl;

    } catch (error) {
        console.error("❌ Payment Error:", error);
        alert(`Payment failed: ${error.message}`);
    }
}



