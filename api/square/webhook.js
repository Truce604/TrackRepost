
import { buffer } from "micro";

export const config = {
  api: {
    bodyParser: false, // Important: disable default body parsing so we can verify the signature
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    const signatureHeader = req.headers['x-square-signature'];
    const rawBody = (await buffer(req)).toString();

    // 🔒 Optional: You can add signature verification here using the Square docs

    const event = JSON.parse(rawBody);
    console.log("📦 Webhook Event Received:", event);

    if (
      event.type === "payment.updated" &&
      event.data?.object?.payment?.status === "COMPLETED"
    ) {
      const payment = event.data.object.payment;
      const userId = payment.note; // Make sure you pass userId in checkout.js (see below)

      console.log("✅ Payment Completed for User:", userId);

      // TODO: Credit the user in Firebase here
      // Example:
      // await admin.firestore().collection('users').doc(userId).update({
      //   credits: FieldValue.increment(500) // Or whatever amount
      // });
    }

    res.status(200).send("✅ Webhook Received");
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    res.status(500).send("Internal Server Error");
  }
}


