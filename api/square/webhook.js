import crypto from "crypto";
import { buffer } from "micro";
import admin from "firebase-admin";

// ✅ Firebase Admin init
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export const config = {
  api: {
    bodyParser: false, // Required for raw signature validation
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const signature = req.headers["x-square-hmacsha256-signature"];
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  console.log("🧪 Loaded Signature Key:", secret);
  console.log("🧪 Signature Key Length:", secret.length);

  try {
    const rawBody = (await buffer(req)).toString();
    console.log("🧾 Raw Body (string):", rawBody);

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("base64");

    console.log("🔒 Received Signature:", signature);
    console.log("🔐 Expected Signature:", expectedSignature);

    if (signature !== expectedSignature) {
      console.warn("⚠️ Invalid signature");
      return res.status(403).send("Invalid signature");
    }

    const event = JSON.parse(rawBody);
    const eventType = event.type || event.event_type;

    console.log("📌 Event Type:", eventType);

    if (eventType === "payment.updated") {
      const payment = event.data.object.payment;
      const note = payment.note || "";

      console.log("🧾 Payment note:", note);

      const userIdMatch = note.match(/userId=([\w-]+)/);
      const creditsMatch = note.match(/(\d+)\sCredits/);

      if (userIdMatch && creditsMatch) {
        const userId = userIdMatch[1];
        const credits = parseInt(creditsMatch[1]);

        console.log("🧾 Parsed userId:", userId);
        console.log("🧾 Parsed credits:", credits);

        await db.collection("users").doc(userId).set(
          {
            credits: admin.firestore.FieldValue.increment(credits),
          },
          { merge: true }
        );

        console.log(`✅ Added ${credits} credits to user ${userId}`);
        return res.status(200).send("Success");
      } else {
        console.warn("⚠️ Could not extract userId or credits from note");
        return res.status(400).send("Missing or invalid note format");
      }
    }

    console.log("ℹ️ Event ignored:", eventType);
    return res.status(200).send("Event ignored");
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return res.status(500).send("Internal Server Error");
  }
}










