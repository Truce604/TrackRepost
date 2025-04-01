import { buffer } from "micro";
import crypto from "crypto";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const rawBody = (await buffer(req)).toString("utf8");
  const receivedSignature = req.headers["x-square-hmacsha256-signature"];
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  console.log("📩 Received:", receivedSignature);
  console.log("🔐 Expected:", expectedSignature);

  if (receivedSignature !== expectedSignature) {
    console.warn("⚠️ Signature mismatch");
    return res.status(403).send("Invalid signature");
  }

  let event;
  try {
    event = JSON.parse(rawBody);
    console.log("📨 Event Type:", event.type || event.event_type);
  } catch (err) {
    console.error("❌ JSON Parse Error:", err);
    return res.status(400).send("Invalid JSON");
  }

  if (event.type === "payment.updated") {
    const payment = event?.data?.object?.payment;
    const note = payment?.note || "";
    console.log("📝 Note:", note);

    const userIdMatch = note.match(/userId=([\w-]+)/);
    const creditsMatch = note.match(/(\d+)\sCredits/);

    if (!userIdMatch || !creditsMatch) {
      console.warn("⚠️ Invalid Note Format");
      return res.status(400).send("Invalid note format");
    }

    const userId = userIdMatch[1];
    const credits = parseInt(creditsMatch[1], 10);

    try {
      await db.collection("users").doc(userId).set({
        credits: admin.firestore.FieldValue.increment(credits),
      }, { merge: true });

      console.log(`✅ Credited ${credits} to user ${userId}`);
      return res.status(200).send("Success");
    } catch (err) {
      console.error("❌ Firestore Error:", err);
      return res.status(500).send("Database error");
    }
  }

  res.status(200).send("Ignored");
}















