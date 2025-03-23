const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const getRawBody = require("raw-body");

admin.initializeApp();
const db = admin.firestore();

exports.squareWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const signature = req.headers["x-square-signature"];
    const webhookKey = functions.config().square.webhook_signature_key;

    // 🔒 Read raw body for signature validation
    const rawBody = await getRawBody(req);
    const expectedSignature = crypto
      .createHmac("sha1", webhookKey)
      .update(rawBody)
      .digest("base64");

    if (signature !== expectedSignature) {
      console.warn("⚠️ Signature mismatch. Webhook not verified.");
      return res.status(400).send("Invalid signature");
    }

    // Parse the actual JSON body after signature check
    const event = JSON.parse(rawBody.toString("utf8"));

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
        return res.status(200).send("Credits added successfully");
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








