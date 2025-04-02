// /api/square/webhook.js
import { buffer } from "micro";
import crypto from "crypto";
import admin from "firebase-admin";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

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
  const signature = req.headers["x-square-hmacsha256-signature"];
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  // Test Event Bypass (Square doesn't sign test events)
  try {
    const body = JSON.parse(rawBody);
    if (body.type === "TEST_NOTIFICATION") {
      console.log("✅ Test notification bypassed signature check");
      return res.status(200).send("Test notification received");
    }
  } catch (err) {
    console.error("❌ Error parsing test notification JSON");
  }

  // Signature Verification
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  if (signature !== expectedSignature) {
    console.warn("⚠️ Signature mismatch");
    console.log("📩 Received:", signature);
    console.log("🔐 Expected:", expectedSignature);
    return res.status(403).send("Invalid signature");
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    console.error("❌ Failed to parse JSON:", err);
    return res.status(400).send("Invalid JSON");
  }

  if (event.type !== "payment.updated") {
    console.log("ℹ️ Ignored event:", event.type);
    return res.status(200).send("Ignored");
  }

  const note = event?.data?.object?.payment?.note || "";
  const userIdMatch = note.match(/userId=([\w-]+)/);
  const creditsMatch = note.match(/(\d+)\sCredits/);

  if (!userIdMatch || !creditsMatch) {
    console.warn("⚠️ Invalid note format:", note);
    return res.status(400).send("Invalid note format");
  }

  const userId = userIdMatch[1];
  const credits = parseInt(creditsMatch[1], 10);

  try {
    await admin.firestore().collection("users").doc(userId).update({
      credits: admin.firestore.FieldValue.increment(credits),
    });
    console.log(`✅ Added ${credits} credits to user ${userId}`);
    return res.status(200).send("Credits updated");
  } catch (err) {
    console.error("❌ Firestore error:", err);
    return res.status(500).send("Error updating Firestore");
  }
}
















