import crypto from "crypto";
import { buffer } from "micro";
import admin from "firebase-admin";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export const config = {
  api: {
    bodyParser: false, // ⛔ Disable body parsing for raw HMAC
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const rawBody = await buffer(req);
  const rawBodyString = rawBody.toString();

  const signature = req.headers["x-square-hmacsha256-signature"];
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  console.log("🧪 Loaded Signature Key:", secret);
  console.log("🧪 Signature Key Length:", secret.length);
  console.log("📦 Incoming Headers:", req.headers);
  console.log("🧾 Raw Body (string):", rawBodyString);

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBodyString);
  const expectedSignature = hmac.digest("base64");

  console.log("🔒 Received Signature:", signature);
  console.log("🔐 Expected Signature:", expectedSignature);

  if (signature !== expectedSignature) {
    console.warn("⚠️ Invalid signature");
    return res.status(403).send("Invalid signature");
  }

  // ✅ Signature verified
  try {
    const event = JSON.parse(rawBodyString);

    if (event.event_type === "TEST_NOTIFICATION") {
      console.log("✅ Test Notification Received");
      return res.status(200).send("Test Received");
    }

    if (event.type === "payment.created") {
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
        console.warn("⚠️ Could not extract userId or credits");
        return res.status(400).send("Invalid note format");
      }
    }

    res.status(200).send("Event ignored");
  } catch (error) {
    console.error("❌ Webhook handler error:", error);
    res.status(500).send("Internal Server Error");
  }
}








