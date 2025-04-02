import getRawBody from 'raw-body';
import crypto from 'crypto';
import admin from 'firebase-admin';

export const config = {
  api: {
    bodyParser: false, // This is required to preserve the raw body for signature verification
  },
};

// 🔥 Initialize Firebase Admin
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

  const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!webhookSecret) {
    console.error("❌ Missing SQUARE_WEBHOOK_SIGNATURE_KEY");
    return res.status(500).send("Missing webhook secret");
  }

  // ✅ Read raw body exactly as received
  const rawBody = (await getRawBody(req)).toString('utf8');
  const receivedSignature = req.headers['x-square-hmacsha256-signature'];

  // ✅ Calculate HMAC
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('base64');

  const signatureMatch = receivedSignature === expectedSignature;

  console.log("📩 Received:", receivedSignature);
  console.log("🔐 Expected:", expectedSignature);
  console.log("🧪 Match:", signatureMatch);

  if (!signatureMatch) {
    console.warn("⚠️ Signature mismatch");
    return res.status(403).send("Invalid signature");
  }

  // ✅ Parse and handle webhook event
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    console.error("❌ JSON parse error:", err);
    return res.status(400).send("Invalid JSON");
  }

  if (event.type !== 'payment.updated') {
    console.log("ℹ️ Event ignored:", event.type);
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

    console.log(`✅ Credited ${credits} to user ${userId}${plan ? ` with plan: ${plan}` : ''}`);
    return res.status(200).send("Credits updated");
  } catch (err) {
    console.error("❌ Firestore error:", err);
    return res.status(500).send("Firestore error");
  }
}

