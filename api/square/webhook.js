
import { Client, Environment } from "square";
import { Buffer } from "buffer";
import crypto from "crypto";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: Environment.Production,
});

// Initialize Firebase Admin (only once)
if (!global._firebaseAdminInitialized) {
  initializeApp();
  global._firebaseAdminInitialized = true;
}
const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const signature = req.headers["x-square-signature"];
  const body = JSON.stringify(req.body);
  const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const endpoint = "https://www.trackrepost.com/api/square/webhook";

  // Verify signature
  const hmac = crypto.createHmac("sha1", webhookSecret);
  hmac.update(endpoint + body);
  const expectedSignature = hmac.digest("base64");

  if (signature !== expectedSignature) {
    console.error("❌ Invalid webhook signature");
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = req.body;

  if (
    event.type === "payment.updated" &&
    event.data?.object?.payment?.status === "COMPLETED"
  ) {
    const note = event.data.object.payment.note;
    const match = note?.match(/(\d+)\sCredits\sPurchase\sfor\suserId=(\w+)/);

    if (match) {
      const credits = parseInt(match[1], 10);
      const userId = match[2];

      const userRef = db.collection("users").doc(userId);
      const userSnap = await userRef.get();

      if (userSnap.exists) {
        const prevCredits = userSnap.data().credits || 0;
        await userRef.update({
          credits: prevCredits + credits,
        });
        console.log(`✅ Updated ${userId} with ${credits} credits`);
      } else {
        console.warn(`⚠️ User ${userId} not found`);
      }
    }
  }

  res.status(200).json({ success: true });
}

