import { Client, Environment } from 'square';
import { buffer } from 'micro';
import * as admin from 'firebase-admin';
import crypto from 'crypto';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

const squareClient = new Client({
  environment: Environment.Production,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const signature = req.headers['x-square-signature'];
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const rawBody = (await buffer(req)).toString();

  const url = 'https://www.trackrepost.com/api/square/webhook';
  const hmac = crypto
    .createHmac('sha1', signatureKey)
    .update(url + rawBody)
    .digest('base64');

  if (signature !== hmac) {
    console.error('❌ Invalid webhook signature.');
    return res.status(400).send('Invalid signature.');
  }

  try {
    const body = JSON.parse(rawBody);
    const eventType = body?.event_type;
    const payment = body?.data?.object?.payment;
    const note = payment?.note;

    if (eventType === 'payment.created' && payment?.status === 'COMPLETED') {
      const match = note?.match(/(\d+)\sCredits\sPurchase\sfor\suserId=(\w+)/);
      if (match) {
        const credits = parseInt(match[1]);
        const userId = match[2];

        const userRef = db.collection('users').doc(userId);
        await db.runTransaction(async (transaction) => {
          const doc = await transaction.get(userRef);
          const currentCredits = doc.exists ? doc.data().credits || 0 : 0;
          transaction.set(userRef, { credits: currentCredits + credits }, { merge: true });
        });

        console.log(`✅ Added ${credits} credits to user ${userId}`);
        return res.status(200).send('Credits updated');
      } else {
        console.warn('⚠️ Note format did not match expected pattern');
      }
    }

    res.status(200).send('No action taken');
  } catch (err) {
    console.error('❌ Webhook handler error:', err);
    res.status(500).send('Server error');
  }
}



