
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const getRawBody = require("raw-body");

const db = admin.firestore(); // no initializeApp here

exports.squareWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const signature = req.headers["x-square-signature"];
    const rawBody = await getRawBody(req);
    const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    const hmac = crypto.createHmac("sha1", webhookSecret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("base64");

    if (signature !== expectedSignature) {
      console.error("Invalid Square signature");
      return res.status(403).send("Forbidden");
    }

    const event = JSON.parse(rawBody.toString());

    if (event.type === "payment.created") {
      const payment = event.data.object.payment;
      const note = payment.note || "";

      const match = note.match(/(\d+)\sCredits\sPurchase\sfor\suserId=(.+)/);

      if (match) {
        const credits = parseInt(match[1]);
        const userId = match[2];

        const userRef = db.collection("users").doc(userId);
        await userRef.update({
          credits: admin.firestore.FieldValue.increment(credits),
        });

        console.log(`✅ Updated ${credits} credits for userId=${userId}`);
      } else {
        console.warn("⚠️ Payment note format did not match expected pattern:", note);
      }
    }

    res.status(200).send("ok");
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).send("Server error");
  }
});






