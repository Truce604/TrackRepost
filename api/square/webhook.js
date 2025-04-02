// api/square/webhook.js
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
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}
const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  if (!webhookSecret) {
    console.error("❌ Missing SQUARE_WEBHOOK_SIGNATURE_KEY");
    return res.status(500).send("Webhook secret not set");
  }

  const rawBodyBuffer = await buffer(req);
  const rawBody = rawBodyBuffer.toString('utf8');
  const receivedSignature = req.headers['x-square-hmacsha256-signature'];

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('base64');

  const signatureMatch = expectedSignature === receivedSignature;

  console.log("🔍 Loaded webhookSecret:", webhookSecret ? "✅ Loaded" : "❌ Missing");
  console.log("📩 Received:", receivedSignature);
  console.log("🔐 Expected:", expectedSignature);
  console.log("🧪 Matches:", signatureMatch);

  if (!signatureMatch) {
    console.warn("⚠️ Signature mismatch");
    return res.status(403).send("Invalid signature");
  }

  // Parse event
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    console.error("❌ Failed to parse event:", err);
    return res.status(400).send("Invalid JSON");
  }

  if (event.type !== "payment.updated") {
    console.log("ℹ️ Ignored event type:", event.type);
    return res.status(200).send("Ignored");
  }

  const note = event?.data?.object?.payment?.note || '';
  const match = note.match(/(\d+)\sCredits\sPurchase\sfor\suserId=([\w-]+)(?:\sPlan=(\w+))?/);

  if (!match) {
    console.warn("⚠️ Invalid note format:", note);
    return res.status(400).send("Invalid note");
  }

  const credits = parseInt(match[1], 10);
  const userId = match[2];
  const plan = match[3] || null;

  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.set({
      credits: admin.firestore.FieldValue.increment(credits),
      ...(plan && {
        plan,
        planActivatedAt: admin.firestore.Timestamp.now(),
      }),
    }, { merge: true });

    console.log(`✅ Credited ${credits} to user ${userId}${plan ? ` (plan: ${plan})` : ''}`);
    return res.status(200).send("Success");
  } catch (err) {
    console.error("❌ Firestore error:", err);
    return res.status(500).send("Firestore update failed");
  }
}

