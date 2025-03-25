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
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = "https://www.trackrepost.com/api/square/webhook";

  try {
    const rawBodyBuffer = await buffer(req);
    const rawBody = rawBodyBuffer.toString("utf8");
    const signatureHeader = req.headers["x-square-hmacsha256-signature"];

    console.log("🧪 Loaded Signature Key:", signatureKey);
    console.log("🔒 Received Signature:", signatureHeader);
    console.log("🧾 Raw Body (string):", rawBody);

    const hmac = crypto.createHmac("sha256", signatureKey);
    hmac.update(notificationUrl + rawBody);
    const expectedSignature = hmac.digest("base64");

    console.log("🔐 Expected Signature:", expectedSignature);

    if (
      !signatureHeader ||
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signatureHeader)
      )
    ) {
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

        await db.collection("users").doc(userId).set(
          {
            credits: admin.firestore.FieldValue.increment(credits),
          },
          { merge: true }
        );

        console.log(`✅ Added ${credits} credits to user ${userId}`);
        return res.status(200).send("Success");
      }

      console.warn("⚠️ Invalid note format");
      return res.status(400).send("Invalid note format");
    }

    return res.status(200).send("Ignored event type");
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return res.status(500).send("Internal Server Error");
  }
}










