import { onRequest } from "firebase-functions/v2/https";
import { onAuthUserCreate } from "firebase-functions/v2/auth";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import crypto from "crypto";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ✅ Assign 30 credits to new users on signup
export const assignCreditsOnSignup = onAuthUserCreate(async (event) => {
  const userId = event.uid;
  const displayName = event.displayName || "New User";

  try {
    await db.collection("users").doc(userId).set({
      credits: 30,
      displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.log(`✅ Assigned 30 credits to ${userId}`);
  } catch (error) {
    logger.error(`❌ Error assigning credits to ${userId}:`, error);
  }
});

// ✅ Square Webhook for credit purchases
export const squareWebhook = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const event = req.body;
    const signature = req.headers["x-square-signature"];
    const webhookKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    const hmac = crypto.createHmac("sha1", webhookKey);
    hmac.update(JSON.stringify(event));
    const expectedSignature = hmac.digest("base64");

    if (signature !== expectedSignature) {
      logger.warn("⚠️ Signature mismatch. Webhook not verified.");
      return res.status(400).send("Invalid signature");
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

        logger.log(`✅ Added ${credits} credits to user ${userId}`);
        return res.status(200).send("Success");
      } else {
        logger.warn("⚠️ Could not extract user ID or credits from note");
        return res.status(400).send("Missing note data");
      }
    }

    return res.status(200).send("Event ignored");
  } catch (err) {
    logger.error("❌ Webhook Error:", err);
    return res.status(500).send("Internal Server Error");
  }
});



