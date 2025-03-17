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
        return res.status(405).send("Method Not Allowed");
    }

    try {
        const rawBody = await buffer(req);
        const { event_type, data } = JSON.parse(rawBody.toString());

        if (event_type !== "payment.created" && event_type !== "payment.updated") {
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
}

