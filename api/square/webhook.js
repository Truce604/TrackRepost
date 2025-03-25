import crypto from "crypto";
import { buffer } from "micro";
import admin from "firebase-admin";

// Firebase init
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

  try {
    const rawBody = await buffer(req);
    const signature =
      req.headers["x-square-hmac-sha256-signature"] || req.headers["x-square-signature"];
    const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    const hmac = crypto.createHmac("sha256", secret); // ✅ Switch from sha1 to sha256
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("base64");

    console.log("🔒 Received Signature:", signature);
    console.log("🔐 Expected Signature:", expectedSignature);

    if (signature !== expectedSignature) {
      console.warn("⚠️ Invalid signature");
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(rawBody.toString());

    // ✅ Handle TEST_NOTIFICATION
    if (event.type === "TEST_NOTIFICATION") {
      console.log("✅ Square TEST_NOTIFICATION received");
      return res.status(200).send("Test successful");
    }

    if (event.type === "payment.created") {
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
        console.warn("⚠️ Missing or invalid note format");
        return res.status(400).send("Missing note data");
      }
    }

    return res.status(200).send("Event ignored");
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return res.status(500).send("Internal Server Error");
  }
}



