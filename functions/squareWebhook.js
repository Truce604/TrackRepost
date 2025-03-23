const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Client } = require("square");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const squareClient = new Client({
  environment: "production", // ✅ Use lowercase string here
  accessToken: process.env.SQUARE_ACCESS_TOKEN
});

exports.squareWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
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
          credits: admin.firestore.FieldValue.increment(credits)
        }, { merge: true });

        console.log(`✅ Added ${credits} credits to user ${userId}`);
        return res.status(200).send("Success");
      }

      return res.status(400).send("Invalid note format");
    }

    return res.status(200).send("Event ignored");
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return res.status(500).send("Internal Server Error");
  }
});





