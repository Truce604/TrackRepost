import crypto from "crypto";
import { buffer } from "micro";
import admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

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

  const signature = req.headers["x-square-hmacsha256-signature"];
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  try {
    const rawBody = (await buffer(req)).toString("utf8");

    // Debug log for signature mismatch troubleshooting
    console.log("🔍 Incoming Headers:", req.headers);
    console.log("🔍 Raw Body:", rawBody);

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("base64");

    if (signature !== expectedSignature) {
      console.warn("⚠️ Invalid signature");
      return res.status(403).send("Invalid signature");
    }

    const event = JSON.parse(rawBody);

    if (event.type === "payment.updated") {
      const payment = event.data.object.payment;
      const note = payment.note || "";

      const userIdMatch = note.match(/userId=([\w-]+)/);
      const creditsMatch = note.match(/(\d+)\sCredits/);

      if (userIdMatch && creditsMatch) {
        const userId = userIdMatch[1];
        const credits = parseInt(creditsMatch[1]);

        await db.collection("users").doc(userId).set({
          credits: FieldValue.increment(credits),
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











