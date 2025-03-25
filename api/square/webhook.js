import crypto from "crypto";
import { buffer } from "micro";
import admin from "firebase-admin";

export const config = {
  api: {
    bodyParser: false, // Disable default body parsing
  },
};

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  console.log("🧪 Loaded Signature Key:", signatureKey);
  console.log("🧪 Signature Key Length:", signatureKey?.length);

  try {
    const rawBodyBuffer = await buffer(req);
    const rawBody = rawBodyBuffer.toString("utf-8");
    const receivedSignature = req.headers["x-square-hmacsha256-signature"];

    const hmac = crypto.createHmac("sha256", signatureKey);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("base64");

    console.log("🔒 Received Signature:", receivedSignature);
    console.log("🔐 Expected Signature:", expectedSignature);
    console.log("🧾 Raw Body (string):", rawBody);

    if (receivedSignature !== expectedSignature) {
      console.warn("⚠️ Invalid signature");
      return res.status(403).send("Invalid signature");
    }

    const event = JSON.parse(rawBody);

    if (event.event_type === "payment.created") {
      const payment = event.data.object.payment;
      const note = payment.note || "";

      const userIdMatch = note.match(/userId=([\w-]+)/);
      const creditsMatch = note.match(/(\d+)\sCredits/);

      if (userIdMatch && creditsMatch) {
        const userId = userIdMatch[1];
        const credits = parseInt(creditsMatch[1]);

        await db.collection("users").doc(userId).set({
          credits: admin.firestore.FieldValue.increment(credits),
        }, { merge: true });

        console.log(`✅ Added ${credits} credits to user ${userId}`);
        return res.status(200).send("Success");
      } else {
        console.warn("⚠️ Missing or invalid note format");
        return res.status(400).send("Missing note data");
      }
    }

    return res.status(200).send("Event ignored");
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return res.status(500).send("Internal Server Error");
  }
}










