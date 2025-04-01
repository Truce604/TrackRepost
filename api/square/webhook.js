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
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  // Log for debugging
  console.log("📦 Raw body received");
  console.log("🧪 rawBody length:", rawBody.length);
  console.log("🧪 rawBody preview:", rawBody.slice(0, 200));
  console.log("📩 Received:", receivedSignature);

  const expectedSignature = crypto
    .createHmac("sha256", secret)
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
    console.error("❌ Failed to parse body:", err);
    return res.status(400).send("Invalid JSON");
  }

  // Optional: bypass signature check for test events
  if (event.event_type === "TEST_NOTIFICATION") {
    console.log("✅ Test notification bypassed signature check");
    return res.status(200).send("Test OK");
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
  const planMatch = note.match(/Plan=(\w+)/);

  if (!userIdMatch || !creditsMatch) {
    console.warn("⚠️ Invalid note format");
    return res.status(400).send("Invalid note format");
  }

  const userId = userIdMatch[1];
  const credits = parseInt(creditsMatch[1], 10);
  const plan = planMatch ? planMatch[1] : null;

  try {
    await db.collection("users").doc(userId).set(
      {
        credits: admin.firestore.FieldValue.increment(credits),
        ...(plan && {
          plan,
          planActivatedAt: admin.firestore.Timestamp.now(),
        }),
      },
      { merge: true }
    );

    console.log(`✅ ${credits} credits added to user ${userId}`);
    if (plan) console.log(`🎟️ Plan activated: ${plan}`);
    return res.status(200).send("Credits updated");
  } catch (err) {
    console.error("❌ Error updating Firestore:", err);
    return res.status(500).send("Error updating user");
  }
}















