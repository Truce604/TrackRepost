const functions = require("firebase-functions");
const admin = require("firebase-admin");
const square = require("square");

if (!admin.apps.length) {
  admin.initializeApp();
}

const { Client, Environment } = square;

const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: Environment.Production
});

exports.squareWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const event = req.body;
    const payment = event?.data?.object?.payment;
    const note = payment?.note || "";

    const userIdMatch = note.match(/userId=([\w-]+)/);
    const creditsMatch = note.match(/(\d+)\sCredits/);

    if (!userIdMatch || !creditsMatch) {
      return res.status(400).send("Invalid note format");
    }

    const userId = userIdMatch[1];
    const credits = parseInt(creditsMatch[1]);

    await admin.firestore().collection("users").doc(userId).set({
      credits: admin.firestore.FieldValue.increment(credits)
    }, { merge: true });

    console.log(`✅ Added ${credits} credits to ${userId}`);
    return res.status(200).send("Success");
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return res.status(500).send("Internal Server Error");
  }
});





