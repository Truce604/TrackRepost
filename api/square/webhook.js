// /api/square/webhook.js
import { buffer } from "micro";
import crypto from "crypto";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
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
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  console.log("📦 Raw body received");
  console.log("🧪 rawBody length:", rawBody.length);
  console.log("🧪 rawBody preview:", rawBody.slice(0, 300));
  console.log("📩 Received:", receivedSignature);
  console.log("🔑 Loaded Env Key:", signatureKey);

  const expectedSignature = crypto
    .createHmac("sha256", signatureKey)
    .update(rawBody)
    .digest("base64");

  console.log("🔐 Expected:", expectedSignature);

  if (receivedSignature !== expectedSignature) {
    console.warn("⚠️ Signature mismatch");
    return res.status(403).send("Invalid signature");
  }

  let event;
  try {
    event = JSON.parse(rawBody);
    console.log("📨 Event parsed:", event.type || event.event_type);
  } catch (err) {
    console.error("❌ JSON parse error:", err);
    return res.status(400).send("Invalid JSON");
  }

  if (event.event_type === "TEST_NOTIFICATION") {
    console.log("✅ Test notification from Square");
    return res.status(200).send("Test received");
  }

  if (event.type === "payment.updated") {
    const payment = event.data?.object?.payment;
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

    try {
      await db.collection("users").doc(userId).set({
        credits: admin.firestore.FieldValue.increment(credits),
      }, { merge: true });

      console.log(`✅ Added ${credits} credits to user ${userId}`);
      return res.status(200).send("Credits updated");
    } catch (err) {
      console.error("❌ Firestore update error:", err);
      return res.status(500).send("Firestore update failed");
    }
  }

  console.log("ℹ️ Event ignored");
  return res.status(200).send("Ignored");
}















