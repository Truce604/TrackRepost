import { Client, Environment, WebhooksHelper } from "square";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin if not already initialized
if (!getFirestore.apps?.length) {
  initializeApp();
}
const db = getFirestore();

// Square setup
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: Environment.Production,
});

const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const signature = req.headers["x-square-signature"];
  const body = JSON.stringify(req.body);

  const isValid = WebhooksHelper.isValidWebhookEventSignature(
    body,
    signature,
    signatureKey,
    req.url
  );

  if (!isValid) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = req.body;
  const payment = event?.data?.object?.payment;

  if (event.type === "payment.created" && payment?.status === "COMPLETED") {
    const note = payment.note || "";
    const match = note.match(/(\d+)\s+Credits\s+Purchase\s+for\s+userId=(\w+)/);

    if (!match) {
      console.error("❌ Could not parse note:", note);
      return res.status(400).json({ error: "Invalid note format." });
    }

    const credits = parseInt(match[1], 10);
    const userId = match[2];

    try {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        await userRef.set({ credits });
      } else {
        await userRef.update({
          credits: (userDoc.data().credits || 0) + credits,
        });
      }

      console.log(`✅ Updated credits for user ${userId}: +${credits}`);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("🔥 Firestore Error:", err);
      return res.status(500).json({ error: "Failed to update credits." });
    }
  }

  res.status(200).json({ received: true });
}


