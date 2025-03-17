import express from "express";
import admin from "firebase-admin";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

// ✅ Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// ✅ Handle Square Payment Webhook
app.post("/api/payment-webhook", async (req, res) => {
    try {
        const { event_type, data } = req.body;

        if (event_type !== "payment.updated") {
            return res.status(400).send("Ignoring non-payment event.");
        }

        const payment = data.object;
        if (payment.status !== "COMPLETED") {
            return res.status(400).send("Payment not completed.");
        }

        const userId = payment.metadata.userId;
        const amountPaid = payment.amount_money.amount / 100; // Convert cents to dollars

        let creditsToAdd = 0;
        if (amountPaid === 5) creditsToAdd = 500;
        else if (amountPaid === 10) creditsToAdd = 1000;
        else if (amountPaid === 25) creditsToAdd = 2500;
        else if (amountPaid === 50) creditsToAdd = 5000;

        await db.collection("users").doc(userId).update({
            credits: admin.firestore.FieldValue.increment(creditsToAdd)
        });

        console.log(`✅ Added ${creditsToAdd} credits to user ${userId}`);
        res.status(200).send("Credits updated.");
    } catch (error) {
        console.error("❌ Webhook Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

export default app;
