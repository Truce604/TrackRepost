const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// ✅ Assign 30 credits to new users on signup
exports.assignCreditsOnSignup = functions.auth.user().onCreate(async (user) => {
  const userId = user.uid;
  const displayName = user.displayName || "New User";

  try {
    await db.collection("users").doc(userId).set({
      credits: 30,
      displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ Assigned 30 credits to ${userId}`);
  } catch (error) {
    console.error(`❌ Error assigning credits to ${userId}:`, error);
  }
});

// ✅ Handle Square Webhook for credit purchases
exports.squareWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const signature = req.headers["x-square-signature"];
    const webhookKey = functions.config().square.webhook_signature_key;
    const rawBody = JSON.stringify(req.body);

    const hmac = crypto.createHmac("sha1", webhookKey);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("base64");

    if (signature !== expectedSignature) {
      console.warn("⚠️ Invalid webhook signature");
      return res.status(400).send("Invalid signature");
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
          credits: admin.firestore.FieldValue.increment(credits),
        }, { merge: true });

        console.log(`✅ Added ${credits} credits to user ${userId}`);
        return res.status(200).send("Success");
      } else {
        console.warn("⚠️ Could not extract userId or credits from note");
        return res.status(400).send("Invalid note format");
      }
    }

    return res.status(200).send("Event ignored");
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return res.status(500).send("Internal Server Error");
  }
});




