
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Client, Environment } = require("square");

admin.initializeApp();
const db = admin.firestore();

// ✅ Assign 30 credits to new users on signup
exports.assignCreditsOnSignup = functions.auth.user().onCreate(async (user) => {
  const userId = user.uid;
  const displayName = user.displayName || "New User";

  try {
    await db.collection("users").doc(userId).set({
      credits: 30,
      displayName: displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Assigned 30 credits to ${userId}`);
  } catch (error) {
    console.error(`❌ Error assigning credits to ${userId}:`, error);
  }
});

// ✅ Square Webhook to add credits after purchase
exports.squareWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const event = req.body;
    const sig = req.headers["x-square-signature"];
    // Optional: validate sig using process.env.SQUARE_WEBHOOK_SIGNATURE_KEY

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

