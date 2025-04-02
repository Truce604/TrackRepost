// /api/square/webhook.js
import { buffer } from 'micro';
import crypto from 'crypto';
import admin from 'firebase-admin';

export const config = {
  api: {
    bodyParser: false,
  },
};

// ✅ TEMP: Hardcode your real signature key here to rule out env var issues
const webhookSecret = "Z3kJNJNMH7IVJkF5tMXQpw";

// ✅ Firebase Admin Initialization
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

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('base64');

  // ✅ Debug logs
  console.log("📩 Received Signature:", receivedSignature);
  console.log("🔐 Expected Signature:", expectedSignature);
  console.log("🧪 Match:", receivedSignature === expectedSignature);
  console.log("🧪 rawBody preview:", rawBody.slice(0, 300));

  if (receivedSignature !== expectedSignature) {
    console.warn("⚠️ Signature mismatch");
    return res.status(403).send("Invalid signature");
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    console.error("❌ Failed to parse event:", err);
    return res.status(400).send("Invalid JSON");
  }

  if (event.type !== "payment.updated") {
    console.log("ℹ️ Ignored event type:", event.type);
    return res.status(200).send("Event ignored");
  }

  const payment = event?.data?.object?.payment;
  const note = payment?.note || "";
  console.log("📝 Note:", note);

  // ✅ Skip if note doesn't match expected format (for test events)
  const match = note.match(/(\d+)\sCredits\sPurchase\sfor\suserId=([\w-]+)(?:\sPlan=(\w+))?/);
  if (!match) {
    console.warn("⚠️ Invalid or test note format");
    return res.status(400).send("Invalid note format");
  }

  const credits = parseInt(match[1], 10);
  const userId = match[2];
  const plan = match[3] || null;

  try {
    await db.collection('users').doc(userId).set({
      credits: admin.firestore.FieldValue.increment(credits),
      ...(plan && {
        plan,
        planActivatedAt: admin.firestore.Timestamp.now()
      })
    }, { merge: true });

    console.log(`✅ Credited ${credits} to user ${userId}${plan ? ` with plan ${plan}` : ""}`);
    return res.status(200).send("Success");
  } catch (err) {
    console.error("❌ Firestore error:", err);
    return res.status(500).send("Failed to update credits");
  }
}


