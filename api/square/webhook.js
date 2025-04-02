// api/square/webhook.js
import { buffer } from 'micro';
import crypto from 'crypto';
import admin from 'firebase-admin';

export const config = {
  api: {
    bodyParser: false,
  },
};

// ✅ Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}
const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const rawBody = (await buffer(req)).toString('utf8');
  const receivedSignature = req.headers['x-square-hmacsha256-signature'];
  const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  // 🔍 Confirm webhookSecret is actually loaded
  console.log('🔍 Loaded webhookSecret:', webhookSecret ? '✅ Loaded' : '❌ Not Loaded');

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('base64');

  const signaturesMatch = receivedSignature === expectedSignature;

  console.log('📩 Received Signature:', receivedSignature);
  console.log('🔐 Expected Signature:', expectedSignature);
  console.log('🧪 Match:', signaturesMatch);
  console.log('🧪 rawBody preview:', rawBody.slice(0, 200));

  if (!signaturesMatch) {
    console.warn('⚠️ Signature mismatch');
    return res.status(403).send('Invalid signature');
  }

  // ✅ Parse and handle payment.updated event
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    console.error('❌ Failed to parse event:', err);
    return res.status(400).send('Invalid JSON');
  }

  if (event.type === 'payment.updated') {
    const note = event?.data?.object?.payment?.note || '';
    const match = note.match(/(\d+)\sCredits\sPurchase\sfor\suserId=([\w-]+)(?:\sPlan=(\w+))?/);

    if (!match) {
      console.warn('⚠️ Invalid note format:', note);
      return res.status(400).send('Invalid note format');
    }

    const credits = parseInt(match[1], 10);
    const userId = match[2];
    const plan = match[3] || null;

    try {
      const userRef = db.collection('users').doc(userId);
      await userRef.set(
        {
          credits: admin.firestore.FieldValue.increment(credits),
          ...(plan && {
            plan,
            planActivatedAt: admin.firestore.Timestamp.now(),
          }),
        },
        { merge: true }
      );

      console.log(`✅ Credited ${credits} to user ${userId}${plan ? ` (Plan: ${plan})` : ''}`);
      return res.status(200).send('Success');
    } catch (err) {
      console.error('❌ Firestore update error:', err);
      return res.status(500).send('Error updating user');
    }
  }

  res.status(200).send('Event ignored');
}



