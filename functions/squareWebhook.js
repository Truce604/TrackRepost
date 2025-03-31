const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const getRawBody = require("raw-body");

admin.initializeApp();
const db = admin.firestore();

exports.squareWebhook = functions
  .runWith({ secrets: ["SQUARE_WEBHOOK_SIGNATURE_KEY"] })
  .https.onRequest(async (req, res) => {
    const signature = req.headers["x-square-signature"];
    const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    if (!webhookSecret) {
      console.error("❌ Missing SQUARE_WEBHOOK_SIGNATURE_KEY");
      return res.status(500).send("Webhook secret not set");
    }

    const rawBody = await getRawBody(req);
    const hmac = crypto.createHmac("sha1", webhookSecret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("base64");

    if (signature !== expectedSignature) {
      console.error("❌ Invalid signature");
      return res.status(403).send("Unauthorized");
    }

    const event = JSON.parse(rawBody);

    if (event.type === "payment.created") {
      const note = event.data?.object?.payment?.note;
      const match = note?.match(/(\d+)\sCredits\sPurchase\sfor\suserId=(\w+)(?:\sPlan=(\w+))?/);

      if (!match) {
        console.warn("⚠️ Note format did not match:", note);
        return res.status(200).send("Note format unrecognized");
      }

      const credits = parseInt(match[1], 10);
      const userId = match[2];
      const plan = match[3] || null;

      try {
        const userRef = db.collection("users").doc(userId);

        // Update credits
        await userRef.update({
          credits: admin.firestore.FieldValue.increment(credits)
        });

        // Optionally update plan
        if (plan) {
          await userRef.update({
            proPlan: plan,
            planStart: admin.firestore.Timestamp.now()
          });
          console.log(`✅ Applied ${plan} plan to user ${userId}`);
        }

        console.log(`✅ Added ${credits} credits to user ${userId}`);
        return res.status(200).send("Success");
      } catch (err) {
        console.error("❌ Firestore update failed:", err);
        return res.status(500).send("Firestore update error");
      }
    }

    res.status(200).send("Event ignored");
  });

