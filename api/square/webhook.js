import { buffer } from "micro";
import crypto from "crypto";
import admin from "firebase-admin";

// ✅ Initialize Firebase Admin with service account
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

export const config = {
  api: {
    bodyParser: false, // Required for raw body signature verification
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const rawBody = await buffer(req);
  const rawText = rawBody.toString("utf8");

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    console.error("❌ Invalid JSON:", err);
    return res.status(400).send("Invalid JSON");
  }

  // ✅ Skip signature check for test events
  if (parsed.event_type === "TEST_NOTIFICATION") {
    console.log("✅ Test notification bypassed signature check");
    return res.status(200).send("Test OK");
  }

  // ✅ HMAC Signature Verification
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const receivedSignature = req.headers["x-square-hmacsha256-signature"];
  const expectedSignature = crypto
    .createHmac("sha256", signatureKey)
    .update(rawBody)
    .digest("base64");

  console.log("📦 Raw body received");
  console.log("🧪 rawBody length:", rawBody.length);
  console.log("🧪 rawBody preview:", rawText.slice(0, 300));
  console.log("📩 Received:", receivedSignature);
  console.log("🔐 Expected:", expectedSignature);

  if (receivedSignature !== expectedSignature) {
    console.warn("⚠️ Signature mismatch");
    return res.status(403).send("Invalid signature");
  }

  // ✅ Only handle real payment.updated events
  if (parsed.type !== "payment.updated") {
    console.log("ℹ️ Ignored event type:", parsed.type);
    return res.status(200).send("Event ignored");
  }

  const payment = parsed?.data?.object?.payment;
  const note = payment?.note || "";
  console.log("📝 Note:", note);

  const userIdMatch = note.match(/userId=([\w-]+)/);
  const creditsMatch = note.match(/(\d+)\sCredits/);

  if (!userIdMatch || !creditsMatch) {
    console.warn("⚠️ Invalid note format");
    return res.status(400).send("Invalid note format");
  }

  const userId = userIdMatch[1];
  const credits = parseInt(creditsMatch[1], 10);
  console.log(`💰 Crediting ${credits} credits to user ${userId}`);

  try {
    await db.collection("users").doc(userId).set(
      {
        credits: admin.firestore.FieldValue.increment(credits),
      },
      { merge: true }
    );

    console.log("✅ Credits updated successfully");
    return res.status(200).send("Success");
  } catch (err) {
    console.error("❌ Error updating credits:", err);
    return res.status(500).send("Error updating credits");
  }
}














