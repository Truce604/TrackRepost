import { buffer } from 'micro';
import * as admin from 'firebase-admin';
import crypto from 'crypto';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const config = {
  api: {
    bodyParser: false, // Required to verify Square signature
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const signature = req.headers['x-square-signature'];
  const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const rawBody = (await buffer(req)).toString();

  const hmac = crypto.createHmac('sha1', webhookSecret);
  hmac.update(rawBody);
  const expectedSignature = hmac.digest('base64');

  if (signature !== expectedSignature) {
    console.error('❌ Invalid Square signature');
    return res.status(400).send('Invalid signature');
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    console.error('❌ Invalid JSON in webhook:', err);
    return res.status(400).send('Invalid JSON');
  }

  const { type, data } = event;

  if (type === 'payment.updated') {
    const payment = data.object.payment;
    const note = payment.note;

    // Expected note format: "500 Credits Purchase for userId=abc123"
    const match = note?.match(/(\d+)\sCredits\sPurchase\sfor\suserId=(.+)/);
    if (!match) {
      console.error('❌ Invalid note format');
      return res.status(400).send('Invalid note format');
    }

    const credits = parseInt(match[1]);
    const userId = match[2];

    const userRef = admin.firestore().collection('users').doc(userId);

    await admin.firestore().runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      const currentCredits = userDoc.exists ? userDoc.data().credits || 0 : 0;
      t.set(userRef, { credits: currentCredits + credits }, { merge: true });
    });

    console.log(`✅ Added ${credits} credits to user ${userId}`);
    return res.status(200).send('Credits updated');
  }

  res.status(200).send('Webhook received');
}


