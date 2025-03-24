import { Client, Environment } from "square";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import crypto from "crypto";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const squareClient = new Client({
  environment: Environment.Production,
  accessToken: process.env.SQUARE_ACCESS_TOKEN
});

const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

export const squareWebhook = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const rawBody = JSON.stringify(req.body);
    const receivedSignature = req.headers["x-square-signature"];

    // ✅ Signature Verification
    const hmac = crypto.createHmac("sha1", signatureKey);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("base64");

    if (receivedSignature !== expectedSignature) {
      console.warn("⚠️ Signature mismatch.");
      return res.status(403).send("Invalid signature");
    }

    const event = req.body;

    if (event.type === "payment.created") {
      const payment = event.data.object.payment;

      const note = payment.note || "";
      const userIdMatch = note.match(/userId=([\w-]+)/);
      const creditsMatch = note.match(/(\d+)\sCredits/);

      if (userIdMatch && creditsMatch) {
        const userId = userIdMatch[1];
        const credits = parseInt(creditsMatch[1]);

        await db.collection("users").doc(userId).set({
          credits: admin.firestore.FieldValue.increment(credits)
        }, { merge: true });

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
});


