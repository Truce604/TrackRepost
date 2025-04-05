// /api/square/webhook.js
import { buffer } from 'micro';
import crypto from 'crypto';
import admin from 'firebase-admin';

export const config = {
  api: {
    bodyParser: false, // DO NOT REMOVE — ensures raw body is untouched
  },
};

// Initialize Firebase admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    ),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  console.log("📡 Square Webhook Triggered");

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Get raw body and correct header
    const rawBody = (await buffer(req)).toString('utf8');
    const receivedSignature = req.headers['x-square-signature'];
    const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('base64');

    // Debug logs
    console.log('📩 Received Signature:', receivedSignature);
    console.log('🔐 Expected Signature:', expectedSignature);
    console.log('🧪 Signature Match:', receivedSignature === expectedSignature);

    // Check signature match
    if (receivedSignature !== expectedSignature) {
      console.error('❌ Signature mismatch — rejecting request');
      return res.status(403).send('Invalid signature');
    }

    const event = JSON.parse(rawBody);

    // Only handle payment.updated
    if (event.type === 'payment.updated') {
      const note = event?.data?.object?.payment?.note || '';
      console.log('📝 Payment Note:', note);

      // Match pattern in note: e.g. "500 Credits Purchase for userId=abc123 Plan=Artist"
      const match = note.match(/(\d+)\sCredits\sPurchase\sfor\suserId=([\w-]+)(?:\sPlan=(\w+))?/);
      if (!match) {
        console.warn('⚠️ Note format invalid — skipping');
        return res.status(400).send('Invalid note format');
      }

      const credits = parseInt(match[1], 10);
      const userId = match[2];
      const plan = match[3] || null;

      await db.collection('users').doc(userId).set(
        {
          credits: admin.firestore.FieldValue.increment(credits),
          ...(plan && {
            plan,
            planActivatedAt: admin.firestore.Timestamp.now(),
          }),
        },
        { merge: true }
      );

      console.log(`✅ Added ${credits} credits to ${userId}${plan ? ` with plan: ${plan}` : ''}`);
      return res.status(200).send('Credits updated');
    }

    return res.status(200).send('Event ignored');
  } catch (err) {
    console.error('❌ Webhook Error:', err);
    return res.status(500).send('Internal Server Error');
  }
}




