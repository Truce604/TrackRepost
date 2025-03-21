import { buffer } from 'micro';
import * as admin from 'firebase-admin';
import crypto from 'crypto';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export const config = {
    api: {
        bodyParser: false, // We need the raw body for signature verification
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).end('Method Not Allowed');
    }

    const signature = req.headers['x-square-signature'];
    const bodyBuffer = await buffer(req);
    const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    const url = 'https://trackrepost.com/api/square/webhook';

    const hmac = crypto.createHmac('sha1', webhookSecret);
    hmac.update(url + bodyBuffer.toString());

    const expectedSignature = hmac.digest('base64');

    if (signature !== expectedSignature) {
        console.error('❌ Signature mismatch');
        return res.status(400).json({ error: 'Invalid signature' });
    }

    let event;
    try {
        event = JSON.parse(bodyBuffer.toString());
    } catch (err) {
        console.error('❌ Invalid JSON:', err);
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    if (event.type === 'payment.created') {
        const payment = event.data.object.payment;
        const note = payment.note; // We’ll use the "note" field to store info

        if (note) {
            const [credits, userId] = note.split('|');

            try {
                const userRef = admin.firestore().collection('users').doc(userId);
                await userRef.update({
                    credits: admin.firestore.FieldValue.increment(Number(credits))
                });

                console.log(`✅ Updated ${credits} credits for user ${userId}`);
                return res.status(200).json({ success: true });
            } catch (err) {
                console.error('❌ Firebase update error:', err);
                return res.status(500).json({ error: 'Failed to update credits' });
            }
        }
    }

    return res.status(200).json({ received: true });
}

