const functions = require("firebase-functions");
const admin = require("./firebaseAdmin"); // shared initialized admin instance
const crypto = require("crypto");
const getRawBody = require("raw-body");

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

    let rawBody;
    try {
      rawBody = await getRawBody(req);
    } catch (err) {
      console.error("❌ Failed to read raw body:", err);
      return res.status(400).send("Invalid request body");
    }

    // ✅ Verify webhook signature
    const hmac = crypto.createHmac("sha1", webhookSecret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("base64");

    if (signature !== expectedSignature) {
      console.error("❌ Invalid signature");
      return res.status(403).send("Unauthorized");
    }

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch (err) {
      console.error("❌ Error parsing webhook event:", err);
      return res.status(400).send("Bad Request");
    }

    if (event.type === "payment.created") {
      const note = event.data?.object?.payment?.note;
      console.log("🔔 Webhook note:", note);

      const match = note?.match(/(\d+)\sCredits\sPurchase\sfor\suserId=([\w-]+)(?:\sPlan=(\w+))?/);

      if (match) {
        const credits = parseInt(match[1], 10);
        const userId = match[2];
        const plan = match[3] || null;

        try {
          const userRef = db.collection("users").doc(userId);
          await userRef.update({
            credits: admin.firestore.FieldValue.increment(credits),
            ...(plan && {
              plan,
              planActivatedAt: admin.firestore.Timestamp.now()
            })
          });

          console.log(`✅ Added ${credits} credits to user ${userId}${plan ? ` with plan ${plan}` : ""}`);
          return res.status(200).send("Credits updated");
        } catch (err) {
          console.error("❌ Firestore update error:", err);
          return res.status(500).send("Error updating user");
        }
      } else {
        console.warn("⚠️ No valid note format found");
      }
    }

    res.status(200).send("Event ignored");
  });

