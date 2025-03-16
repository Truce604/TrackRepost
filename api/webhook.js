import { buffer } from 'micro';
import crypto from 'crypto';
import admin from 'firebase-admin';

// ✅ Ensure Firebase Admin SDK is initialized only once
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
    });
}

const db = admin.firestore();

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const signature = req.headers['x-square-signature'];
        const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error("🚨 Webhook secret is missing in environment variables.");
            return res.status(500).send('Webhook secret is missing.');
        }

        const rawBody = await buffer(req);
        const hmac = crypto.createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('base64');

        if (signature !== hmac) {
            console.error("🚨 Unauthorized webhook request.");
            return res.status(401).send('Unauthorized');
        }

        const event = JSON.parse(rawBody.toString());
        console.log("📌 Square Webhook Event Received:", event);

        if (event.type === 'payment.completed') {
            const payment = event.data.object.payment;
            const email = payment.buyer_email_address;
            const amountPaid = payment.amount_money.amount / 100; // Convert cents to dollars

            console.log(`✅ Payment Completed for: ${email}, Amount: $${amountPaid}`);

            // 🎯 Determine how many credits to give based on payment amount
            let credits = 0;
            if (amountPaid === 5) credits = 50;    // $5 → 50 credits
            if (amountPaid === 10) credits = 120;  // $10 → 120 credits
            if (amountPaid === 20) credits = 250;  // $20 → 250 credits
            if (amountPaid === 50) credits = 700;  // $50 → 700 credits
            if (amountPaid === 100) credits = 1500; // $100 → 1500 credits

            if (credits > 0) {
                console.log(`💰 Adding ${credits} credits to user: ${email}`);

                // 🔥 Find the user in Firestore by email
                const usersRef = db.collection('users');
                const userSnapshot = await usersRef.where('email', '==', email).get();

                if (!userSnapshot.empty) {
                    const userDoc = userSnapshot.docs[0];
                    const userId = userDoc.id;
                    const currentCredits = userDoc.data().credits || 0;

                    await usersRef.doc(userId).update({
                        credits: currentCredits + credits,
                    });

                    console.log(`🎉 Successfully updated credits for ${email}. New total: ${currentCredits + credits}`);
                } else {
                    console.warn(`⚠️ User not found: ${email}. Cannot add credits.`);
                }
            } else {
                console.warn(`⚠️ Unknown payment amount received: $${amountPaid}. No credits awarded.`);
            }
        }

        return res.status(200).send('Webhook processed.');
    } catch (error) {
        console.error("❌ Webhook processing error:", error);
        return res.status(500).send('Internal Server Error');
    }
}

