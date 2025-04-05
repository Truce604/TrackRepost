// /api/square/webhook.js
import { buffer } from 'micro';
import crypto from 'crypto';
import admin from 'firebase-admin';

export const config = {
  api: {
    bodyParser: false,
  },
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    ),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  console.log("📡 Incoming Webhook Triggered");

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const rawBody = (await buffer(req)).toString('utf8');
    const receivedSignature = req.headers['x-square-signature']; // ✅ Corrected
    const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('base64');

    console.log('📩 Received Signature:', receivedSignature);
    console.log('🔐 Expected Signature:', expectedSignature);
    console.log('🧪 Match:', receivedSignature === expectedSignature);

    if (receivedSignature !== expectedSignature) {
      console.error('❌ Signature mismatch');
      return res.status(403).send('Invalid signature');
    }

    const event = JSON.parse(rawBody);

    if (event.type === 'payment.updated') {
      const note = event?.data?.object?.payment?.note || '';
      console.log('📝 Note:', note);

      const match = note.match(/(\d+)\sCredits\sPurchase\sfor\suserId=([\w-]+)(?:\sPlan=(\w+))?/);
      if (!match) {
        console.warn('⚠️ Invalid note format');
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

      console.log(`✅ Credited ${credits} to user ${userId}${plan ? ` (plan: ${plan})` : ''}`);
      return res.status(200).send('Success');
    }

    res.status(200).send('Ignored');
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.status(500).send('Internal Server Error');
  }
}



