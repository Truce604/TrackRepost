const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const getRawBody = require("raw-body");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

exports.squareWebhook = functions
  .runWith({ secrets: ["SQUARE_WEBHOOK_SIGNATURE_KEY"] })
  .https.onRequest(async (req, res) => {
    const signature = req.headers["x-square-signature"];
    const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    if (!webhookSecret) {
      console.error("Missing SQUARE_WEBHOOK_SIGNATURE_KEY");
      return res.status(500).send("Webhook secret not set");
    }

    const rawBody = await getRawBody(req);

    const hmac = crypto.createHmac("sha1", webhookSecret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("base64");

    if (signature !== expectedSignature) {
      console.error("Invalid signature");
      return res.status(403).send("Unauthorized");
    }

    const event = JSON.parse(rawBody);

    if (event.type === "payment.created") {
      const note = event.data.object.payment.note;
      const match = note?.match(/(\d+)\sCredits\sPurchase\sfor\suserId=(\w+)/);

      if (match) {
        const credits = parseInt(match[1], 10);
        const userId = match[2];

        const userRef = db.collection("users").doc(userId);

        const updateData = {
          credits: admin.firestore.FieldValue.increment(credits),
        };

        if (credits >= 2500) {
          const now = new Date();
          const oneMonthLater = new Date();
          oneMonthLater.setMonth(now.getMonth() + 1);

          updateData.proPlan = credits === 2500 ? "artist"
                           : credits === 5000 ? "network"
                           : credits === 25000 ? "promoter"
                           : null;

          updateData.proPlanExpires = admin.firestore.Timestamp.fromDate(oneMonthLater);
        }

        await userRef.update(updateData);

        console.log(`✅ Added ${credits} credits to user ${userId}`);
        return res.status(200).send("Success");
      } else {
        console.warn("No matching note format found");
      }
    }

    res.status(200).send("Ignored");
  });
