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
    bodyParser: false, // required to get raw body
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = "https://www.trackrepost.com/api/square/webhook";
  const signatureHeader = req.headers["x-square-hmacsha256-signature"];

  const rawBodyBuffer = await buffer(req);
  const rawBody = rawBodyBuffer.toString();

  console.log("🧪 Loaded Signature Key:", signatureKey);
  console.log("🔒 Received Signature:", signatureHeader);
  console.log("🧾 Raw Body (string):", rawBody);

  // Step 1: Concatenate URL + Body
  const combined = notificationUrl + rawBody;

  // Step 2: HMAC-SHA256 hash
  const hmac = crypto.createHmac("sha256", signatureKey);
  hmac.update(combined);
  const expectedSignature = hmac.digest("base64");

  console.log("🔐 Expected Signature:", expectedSignature);

  if (signatureHeader !== expectedSignature) {
    console.warn("⚠️ Invalid signature");
    return res.status(403).send("Invalid signature");
  }

  // Step 3: Parse event
  const event = JSON.parse(rawBody);

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
      return res.status(200).send("Credits updated");
    } else {
      console.warn("⚠️ Missing user ID or credit amount in note");
      return res.status(400).send("Invalid note format");
    }
  }

  return res.status(200).send("Event received");
}















