import crypto from "crypto";
import { buffer } from "micro";
import admin from "firebase-admin";

// ✅ Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ✅ Vercel config: disable bodyParser so we can read raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const signature = req.headers["x-square-signature"];

  console.log("🧪 Loaded Signature Key:", secret);
  console.log("🧪 Signature Key Length:", secret?.length);
  console.log("📦 Incoming Headers:", req.headers);

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const rawBody = await buffer(req);
    console.log("🧾 Raw Body (string):", rawBody.toString());

    // ✅ Generate HMAC-SHA1 from rawBody
    const hmac = crypto.createHmac("sha1", secret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("base64");

    console.log("🔒 Received Signature:", signature);
    console.log("🔐 Expected Signature:", expectedSignature);

    if (signature !== expectedSignature) {
      console.warn("⚠️ Invalid signature");
      return res.status(403).send("Invalid signature");
    }

    const event = JSON.parse(rawBody.toString());

    // ✅ Only process payment.created or payment.updated events
    if (event.type === "payment.created" || event.type === "payment.updated") {
      const payment = event.data?.object?.payment;
      const note = payment?.note || "";

      const userIdMatch = note.match(/userId=([\w-]+)/);
      const creditsMatch = note.match(/(\d+)\sCredits/);

      if (userIdMatch && creditsMatch) {
        const userId = userIdMatch[1];
        const credits = parseInt(creditsMatch[1]);

        await db.collection("users").doc(userId).set({
          credits: admin.firestore.FieldValue.increment(credits),
        }, { merge: true });

        console.log(`✅ Added ${credits} credits to user ${userId}`);
        return res.status(200).send("Credits updated");
      } else {
        console.warn("⚠️ Missing userId or credits in note:", note);
        return res.status(400).send("Missing or invalid note format");
      }
    }

    return res.status(200).send("Event ignored");
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return res.status(500).send("Internal Server Error");
  }
}














