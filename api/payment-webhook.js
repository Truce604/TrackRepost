import admin from "firebase-admin";
import { buffer } from "micro";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

export const config = {
    api: {
        bodyParser: false, // Required for raw request body
    },
};

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const rawBody = await buffer(req);
        const event = JSON.parse(rawBody.toString());

        console.log("🔹 Webhook Event Received:", event);

        if (!event || !event.data || !event.data.object) {
            console.error("❌ Invalid webhook payload:", event);
            return res.status(400).json({ error: "Invalid webhook payload." });
        }

        const { event_type, data } = event;
        const payment = data.object;

        if (!payment || !payment.id || !payment.amount_money) {
            console.error("❌ Missing payment details:", payment);
            return res.status(400).json({ error: "Missing payment details." });
        }

        if (event_type !== "payment.updated" && event_type !== "payment.created") {
            console.log("❌ Ignoring non-payment event:", event_type);
            return res.status(400).json({ error: "Ignoring non-payment event." });
        }

        if (payment.status !== "COMPLETED") {
            console.log("❌ Payment not completed. Ignoring.");
            return res.status(400).json({ error: "Payment not completed." });
        }

        const userId = payment.metadata?.userId;
        if (!userId) {
            console.error("❌ Missing userId in metadata.");
            return res.status(400).json({ error: "Missing userId in payment metadata." });
        }

        const amountPaid = payment.amount_money.amount / 100; // Convert cents to dollars
        let creditsToAdd = 0;

        if (amountPaid === 24.99) creditsToAdd = 500;
        else if (amountPaid === 34.99) creditsToAdd = 1000;
        else if (amountPaid === 79.99) creditsToAdd = 2500;
        else if (amountPaid === 139.99) creditsToAdd = 5000;
        else if (amountPaid === 549.99) creditsToAdd = 25000;
        else {
            console.error("❌ Invalid payment amount:", amountPaid);
            return res.status(400).json({ error: "Invalid payment amount." });
        }

        await db.collection("users").doc(userId).update({
            credits: admin.firestore.FieldValue.increment(creditsToAdd)
        });

        console.log(`✅ Added ${creditsToAdd} credits to user ${userId}`);
        res.status(200).json({ success: true });

    } catch (error) {
        console.error("❌ Webhook Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
}

