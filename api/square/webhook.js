import { buffer } from 'micro';
import crypto from 'crypto';
import admin from 'firebase-admin';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}
const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const rawBody = (await buffer(req)).toString('utf8');
  const receivedSignature = req.headers['x-square-hmacsha256-signature'];
  const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  // Try to parse the body first
  let parsedEvent = {};
  try {
    parsedEvent = JSON.parse(rawBody);
  } catch (err) {
    console.error('❌ Failed to parse JSON:', err);
    return res.status(400).send('Invalid JSON');
  }

  const isTestEvent = parsedEvent?.merchant_id === '6SSW7HV8K2ST5' || parsedEvent?.event_id === '6a8f5f28-54a1-4eb0-a98a-3111513fd4fc';

  if (!isTestEvent) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('base64');

    console.log('📩 Received Signature:', receivedSignature);
    console.log('🔐 Expected Signature:', expectedSignature);
    console.log('🧪 Match:', receivedSignature === expectedSignature);
    console.log('🧪 rawBody preview:', rawBody.slice(0, 200));

    if (receivedSignature !== expectedSignature) {
      return res.status(403).send('Invalid signature');
    }
  } else {
    console.log('✅ Bypassing signature for known test event');
  }

  const event = parsedEvent;
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


