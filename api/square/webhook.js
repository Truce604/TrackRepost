import { buffer } from "micro";
import crypto from "crypto";
import admin from "firebase-admin";

// ✅ Parse Firebase service account from env
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// 🔐 Square signature key
const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

// ✅ Initialize Firebase Admin with service account
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const rawBody = (await buffer(req)).toString("utf8");
  const receivedSignature = req.headers["x-square-hmacsha256-signature"];
  const expectedSignature = crypto
    .createHmac("sha256", signatureKey)
    .update(rawBody)
    .digest("base64");

  console.log("📦 Raw body received");
  console.log("📩 Received:", receivedSignature);
  console.log("🔐 Expected:", expectedSignature);

  if (receivedSignature !== expectedSignature) {
    console.warn("⚠️ Signature mismatch");
    return res.status(403).send("Invalid signature");
  }

  let event;
  try {
    event = JSON.parse(rawBody);
    console.log("📨 Event parsed:", event.type);
  } catch (err) {
    console.error("❌ Failed to parse event JSON:", err);
    return res.status(400).send("Invalid JSON");
  }

  if (event.type !== "payment.updated") {
    console.log("ℹ️ Ignored event type:", event.type);
    return res.status(200).send("Ignored");
  }

  const payment = event?.data?.object?.payment;
  const note = payment?.note || "";

  console.log("📝 Note:", note);

  const userIdMatch = note.match(/userId=([\w-]+)/);
  const creditsMatch = note.match(/(\d+)\sCredits/);

  if (!userIdMatch || !creditsMatch) {
    console.warn("⚠️ Note format invalid");
    return res.status(400).send("Invalid note format");
  }

  const userId = userIdMatch[1];
  const credits = parseInt(creditsMatch[1], 10);

  console.log(`💰 Crediting ${credits} credits to user ${userId}`);

  try {
    await db.collection("users").doc(userId).set({
      credits: admin.firestore.FieldValue.increment(credits),
    }, { merge: true });

    console.log("✅ Credits updated successfully");
    return res.status(200).send("Success");
  } catch (err) {
    console.error("❌ Error updating Firestore credits:", err);
    return res.status(500).send("Internal error");
  }
}











