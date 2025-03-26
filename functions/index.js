const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const getRawBody = require("raw-body");

admin.initializeApp();
const db = admin.firestore();

// ✅ Assign 30 credits on signup
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
  } catch (err) {
    console.error("❌ Error assigning credits:", err);
  }
});

// ✅ Handle Square Webhook
exports.squareWebhook = functions.runWith({ secrets: ["SQUARE_WEBHOOK_SIGNATURE_KEY"] }).https.onRequest(async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const rawBody = await getRawBody(req);
    const receivedSignature = req.headers["x-square-hmacsha256-signature"];
    const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    console.log("🧾 Raw Body (string):", rawBody.toString());
    console.log("🔒 Received Signature:", receivedSignature);

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("base64");

    console.log("🔐 Expected Signature:", expectedSignature);

    if (receivedSignature !== expectedSignature) {
      console.warn("⚠️ Signature mismatch. Webhook rejected.");
      return res.status(403).send("Invalid signature");
    }

    const event = JSON.parse(rawBody.toString());

    if (event.type === "payment.updated" || event.type === "payment.created") {
      const payment = event.data.object.payment;
      const note = payment?.note || "";

      const userIdMatch = note.match(/userId=([\w-]+)/);
      const creditsMatch = note.match(/(\d+)\sCredits/);

      if (userIdMatch && creditsMatch) {
        const userId = userIdMatch[1];
        const credits = parseInt(creditsMatch[1]);

        await db.collection("users").doc(userId).set({
          credits: admin.firestore.FieldValue.increment(credits),
        }, { merge: true });

        console.log(`✅ Added ${credits} credits to user ${userId}`);
        return res.status(200).send("Credits added successfully");
      } else {
        console.warn("⚠️ Could not extract user ID or credits from note");
        return res.status(400).send("Missing note data");
      }
    }

    res.status(200).send("Event ignored");
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).send("Internal Server Error");
  }
});



