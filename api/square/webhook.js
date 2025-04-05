// api/square/webhook.js
import { buffer } from 'micro';
import crypto from 'crypto';
import admin from 'firebase-admin';

export const config = {
  api: {
    bodyParser: false, // Required for raw body verification
  },
};

// ✅ Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    ),
  });
}
const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const rawBody = (await buffer(req)).toString('utf8');
  const receivedSignature = req.headers['x-square-hmacsha256-signature'];
  const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  // ✅ Signature Check
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('base64');

  const signatureValid = receivedSignature === expectedSignature;

  if (!signatureValid) {
    console.warn('❌ Invalid webhook signature');
    return res.status(403).send('Invalid signature');
  }

  // ✅ Parse JSON safely
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    console.error('❌ Failed to parse webhook body:', err);
    return res.status(400).send('Invalid JSON');
  }

  // ✅ Only handle payment.updated
  if (event.type === 'payment.updated') {
    const payment = event?.data?.object?.payment;
    const note = payment?.note || '';

    const match = note.match(/(\d+)\sCredits\sPurchase\sfor\suserId=([\w-]+)(?:\sPlan=(\w+))?/);

    if (!match) {
      console.warn('⚠️ Note did not match expected format:', note);
      return res.status(400).send('Invalid note format');
    }

    const credits = parseInt(match[1], 10);
    const userId = match[2];
    const plan = match[3] || null;

    try {
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

      console.log(`✅ Credited ${credits} to user ${userId}${plan ? ` + Plan: ${plan}` : ''}`);
      return res.status(200).send('Success');
    } catch (err) {
      console.error('❌ Firestore error:', err);
      return res.status(500).send('Firestore update failed');
    }
  }

  // 💤 Ignore non-payment events
  return res.status(200).send('Ignored');
}



