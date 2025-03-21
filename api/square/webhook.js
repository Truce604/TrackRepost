import crypto from "crypto";

// Disable body parsing to get raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log("📩 Square Webhook Hit");

  // Square Signature Key (replace this with process.env if set there)
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  if (!signatureKey) {
    console.error("❌ Missing Webhook Secret or Signature Key");
    return res.status(400).send("Missing webhook secret.");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);
    const signatureHeader = req.headers["x-square-signature"];

    // Verify signature
    const hmac = crypto.createHmac("sha1", signatureKey);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("base64");

    if (signatureHeader !== expectedSignature) {
      console.error("❌ Invalid signature");
      return res.status(401).send("Invalid signature");
    }

    const event = JSON.parse(rawBody.toString());

    console.log("✅ Verified Webhook Event:", event.type);
    console.log("📦 Event Data:", event.data);

    // 🛠️ Later: Handle credit updates here based on event type
    if (event.type === "payment.updated" || event.type === "payment.created") {
      const payment = event.data.object.payment;
      console.log("💵 Payment Info:", payment);
      // TODO: Look up user ID and update credits
    }

    return res.status(200).send("Webhook received.");
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return res.status(500).send("Server Error");
  }
}


