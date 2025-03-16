import { squareConfig } from "./firebaseConfig.js";

// ✅ Firebase Setup
const auth = firebase.auth();
const db = firebase.firestore();

document.getElementById("subscribeBtn").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to subscribe.");
        return;
    }

    const selectedPlan = parseInt(document.getElementById("subscriptionPlan").value);
    const planName = selectedPlan === 10 ? "Basic" : selectedPlan === 20 ? "Pro" : "Elite";
    const credits = selectedPlan === 10 ? 500 : selectedPlan === 20 ? 1200 : "Unlimited";

    try {
        // ✅ Process Subscription Payment
        const response = await fetch("https://connect.squareup.com/v2/payments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${squareConfig.accessToken}`
            },
            body: JSON.stringify({
                source_id: "CARD_ON_FILE", // Square manages recurring billing
                amount_money: {
                    amount: selectedPlan * 100,
                    currency: "USD"
                },
                location_id: squareConfig.locationId
            })
        });

        const result = await response.json();
        if (!result.payment) throw new Error("Subscription failed");

        // ✅ Store Subscription in Firestore
        await db.collection("subscriptions").doc(user.uid).set({
            userId: user.uid,
            plan: planName,
            credits: credits,
            startDate: new Date()
        });

        alert(`✅ Subscription successful! You're now on the ${planName} plan.`);
    } catch (error) {
        console.error("❌ Subscription Error:", error);
        alert("🚨 Subscription failed. Please try again.");
    }
});
