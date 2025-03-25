import crypto from "crypto";
import { buffer } from "micro";
import admin from "firebase-admin";

// Init Firebase
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export const config = {
  api: {
    bodyParser: false, // Needed to verify HMAC
  },
};

export default async function handler(req, res) {
  console.log("🧪 Loaded Signature Key:", process.env.SQUARE_WEBHOOK_SIGNATURE_KEY);
  console.log("🧪 Signature Key Length:", process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.length);

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const rawBody = await buffer(req);
  const signature = req.headers["x-square-hmacsha256-signature"];
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  if (!secret || !signature) {
    console.warn("❌ Missing signature or secret");
    return res.status(403).send("Missing signature or secret");
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const expectedSignature = hmac.digest("base64");

  console.log("🔒 Received Signature:", signature);
  console.log("🔐 Expected Signature:", expectedSignature);
  console.log("🧾 Raw Body (string):", rawBody.toString());

  if (signature !== expectedSignature) {
    console.warn("⚠️ Invalid signature");
    return res.status(403).send("Invalid signature");
  }

  const event = JSON.parse(rawBody.toString());

  if (event.event_type === "TEST_NOTIFICATION") {
    console.log("✅ Test Notification Received");
    return res.status(200).send("Test OK");
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
      console.warn("⚠️ Missing user ID or credits in note");
      return res.status(400).send("Invalid note format");
    }
  }

  return res.status(200).send("Ignored");
}










