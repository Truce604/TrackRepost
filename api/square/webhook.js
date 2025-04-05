// /api/square/webhook.js
import { buffer } from 'micro';
import crypto from 'crypto';
import admin from 'firebase-admin';

export const config = {
  api: {
    bodyParser: false, // ❗ must disable bodyParser
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

  const rawBody = (await buffer(req)).toString('utf8');
  const receivedSignature = req.headers['x-square-hmacsha256-signature'];
  const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  console.log('📩 Received Signature:', receivedSignature);
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('base64');
  console.log('🔐 Expected Signature:', expectedSignature);
  console.log('🧪 Match:', receivedSignature === expectedSignature);

  if (receivedSignature !== expectedSignature) {
    return res.status(403).send('Invalid signature');
  }

  // ✅ continue with event processing...
  res.status(200).send('OK');
}


