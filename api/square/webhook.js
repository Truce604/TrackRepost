import crypto from "crypto";
import { buffer } from "micro";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export const config = {
  api: {
    bodyParser: false, // We must use raw body for HMAC check
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const signature = req.headers["x-square-hmacsha256-signature"];

  try {
    const rawBody = await buffer(req); // DO NOT .toString() here

    console.log("🧪 Loaded Signature Key:", secret);
    console.log("🔒 Received Signature:", signature);

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(rawBody); // Use raw Buffer directly
    const expectedSignature = hmac.digest("base64");

    console.log("🔐 Expected Signature:", expectedSignature);

    if (signature !== expectedSignature) {
      console.warn("⚠️ Invalid signature");
      return res.status(403).send("Invalid signature");
    }

    const event = JSON.parse(rawBody.toString());

    if (event.type === "payment.updated") {
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
      } else {
        console.warn("⚠️ Could not extract user ID or credits from note");
        return res.status(400).send("Missing note data");
      }
    }

    return res.status(200).send("Event ignored");
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return res.status(500).send("Internal Server Error");
  }
}













