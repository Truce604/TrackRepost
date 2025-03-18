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
    console.log("📩 Webhook received:", req.method);

    if (req.method !== "POST") {
        console.warn("🚨 Invalid request method:", req.method);
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const rawBody = await buffer(req);
        const payload = JSON.parse(rawBody.toString());

        console.log("✅ Parsed Payload:", payload);

        const { event_type, data } = payload;

        if (!data || !data.object) {
            console.error("❌ Invalid payload structure:", payload);
            return res.status(400).json({ error: "Invalid payload structure." });
        }

        if (event_type !== "payment.created" && event_type !== "payment.updated") {
            console.warn("⚠️ Ignoring event type:", event_type);
            return res.status(400).json({ error: "Ignoring non-payment event." });
        }

        const payment = data.object;

        if (payment.status !== "COMPLETED") {
            console.warn(`⚠️ Payment not completed (status: ${payment.status})`);
            return res.status(400).json({ error: "Payment not completed." });
        }

        if (!payment.metadata || !payment.metadata.userId) {
            console.error("❌ Missing userId in payment metadata.");
            return res.status(400).json({ error: "Invalid payment metadata." });
        }

        const userId = payment.metadata.userId;
        const amountPaid = parseFloat(payment.amount_money.amount) / 100;

        console.log(`💰 Payment Received: $${amountPaid} from user ${userId}`);

        let creditsToAdd = 0;
        if (Math.abs(amountPaid - 24.99) < 0.01) creditsToAdd = 500;
        else if (Math.abs(amountPaid - 34.99) < 0.01) creditsToAdd = 1000;
        else if (Math.abs(amountPaid - 79.99) < 0.01) creditsToAdd = 2500;
        else if (Math.abs(amountPaid - 139.99) < 0.01) creditsToAdd = 5000;
        else if (Math.abs(amountPaid - 549.99) < 0.01) creditsToAdd = 25000;
        else {
            console.warn(`⚠️ Unrecognized payment amount: $${amountPaid}`);
            return res.status(400).json({ error: "Invalid payment amount." });
        }

        // ✅ Update user's credits in Firestore
        await db.collection("users").doc(userId).update({
            credits: admin.firestore.FieldValue.increment(creditsToAdd),
        });

        console.log(`✅ Added ${creditsToAdd} credits to user ${userId}`);
        res.status(200).json({ success: true, message: "Credits updated." });
    } catch (error) {
        console.error("❌ Webhook Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
}

