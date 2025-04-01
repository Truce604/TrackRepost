import crypto from "crypto";
import { buffer } from "micro";
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
    console.log("❌ Invalid method:", req.method);
    return res.status(405).send("Method Not Allowed");
  }

  const signature = req.headers["x-square-hmacsha256-signature"];
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  if (!signature || !secret) {
    console.warn("⚠️ Missing signature or secret");
    return res.status(400).send("Missing signature or secret");
  }

  const rawBody = await buffer(req);
  const rawBodyString = rawBody.toString("utf8");
  console.log("📦 Raw body received");

  // ✅ Create HMAC digest
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBodyString);
  const expectedSignature = hmac.digest("base64");

  try {
    const valid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );

    if (!valid) {
      console.warn("⚠️ Signature mismatch");
      console.log("🔐 Expected:", expectedSignature);
      console.log("📩 Received:", signature);
      return res.status(403).send("Invalid signature");
    }
  } catch (err) {
    console.error("❌ Signature comparison error:", err);
    return res.status(403).send("Invalid signature format");
  }

  let event;
  try {
    event = JSON.parse(rawBodyString);
    console.log("📨 Event parsed:", event.type || event.event_type);
  } catch (err) {
    console.error("❌ Failed to parse body:", err);
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
      console.warn("⚠️ Invalid note format. Skipping update.");
      return res.status(400).send("Missing data in note");
    }

    const userId = userIdMatch[1];
    const credits = parseInt(creditsMatch[1], 10);

    console.log(`🎯 Adding ${credits} credits to user ${userId}`);

    await db.collection("users").doc(userId).set({
      credits: admin.firestore.FieldValue.increment(credits),
    }, { merge: true });

    console.log("✅ Credits updated successfully");
    return res.status(200).send("Credits updated");
  }

  console.log("ℹ️ Event type ignored:", event.type);
  return res.status(200).send("Event ignored");
}

    










