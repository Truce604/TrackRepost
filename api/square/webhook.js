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
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // Step 1: Get raw body
  let rawBody;
  try {
    rawBody = (await buffer(req)).toString('utf8');
  } catch (err) {
    console.error("❌ Failed to parse raw body", err);
    return res.status(400).send('Invalid raw body');
  }

  const receivedSignature = req.headers['x-square-hmacsha256-signature'];
  const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  if (!receivedSignature || !webhookSecret) {
    console.error("❌ Missing signature or secret");
    return res.status(400).send('Missing signature or secret');
  }

  // Step 2: HMAC signature verification
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('base64');

  console.log("📩 Received Signature:", receivedSignature);
  console.log("🔐 Expected Signature:", expectedSignature);
  console.log("🧪 Match:", receivedSignature === expectedSignature);

  if (receivedSignature !== expectedSignature) {
    return res.status(403).send('❌ Invalid webhook signature');
  }

  // Step 3: Parse the body
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    console.error('❌ Invalid JSON body:', err);
    return res.status(400).send('Invalid JSON');
  }

  // Step 4: Check type
  if (event.type !== 'payment.updated') {
    console.log("⚠️ Ignored event:", event.type);
    return res.status(200).send('Ignored');
  }

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
    const userRef = db.collection('users').doc(userId);
    const transactionRef = db.collection('transactions').doc();

    const batch = db.batch();

    batch.set(
      userRef,
      {
        credits: admin.firestore.FieldValue.increment(credits),
        ...(plan && {
          plan,
          planActivatedAt: admin.firestore.Timestamp.now(),
        }),
      },
      { merge: true }
    );

    batch.set(transactionRef, {
      userId,
      type: 'purchased',
      amount: credits,
      reason: `Purchased: ${credits} credits${plan ? ` + ${plan} Plan` : ''}`,
      timestamp: admin.firestore.Timestamp.now(),
    });

    await batch.commit();

    console.log(`✅ Credited ${credits} to user ${userId}${plan ? ` + ${plan}` : ''}`);
    return res.status(200).send('Success');
  } catch (err) {
    console.error('❌ Firestore error:', err);
    return res.status(500).send('Firestore update failed');
  }
}

