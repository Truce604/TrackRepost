import functions from "firebase-functions";
import admin from "firebase-admin";
import crypto from "crypto";
import getRawBody from "raw-body";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export const squareWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const signature = req.headers["x-square-hmacsha256-signature"];
    const rawBody = await getRawBody(req);
    const expectedSignature = crypto
      .createHmac("sha256", process.env.SQUARE_WEBHOOK_SIGNATURE_KEY)
      .update(rawBody)
      .digest("base64");

    if (signature !== expectedSignature) {
      console.warn("⚠️ Signature mismatch.");
      return res.status(403).send("Invalid signature");
    }

    const event = JSON.parse(rawBody.toString("utf8"));

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
      }

      return res.status(400).send("Missing userId or credits");
    }

    return res.status(200).send("Ignored non-payment.updated event");
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return res.status(500).send("Internal Server Error");
  }
});








