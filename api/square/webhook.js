
import { buffer } from "micro";
import crypto from "crypto";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const signature = req.headers["x-square-hmacsha256-signature"];
    const rawBody = await buffer(req);

    if (!signature || !process.env.SQUARE_WEBHOOK_SECRET) {
        return res.status(400).json({ error: "Missing Webhook Secret or Signature" });
    }

    // Verify Webhook Signature
    const hmac = crypto.createHmac("sha256", process.env.SQUARE_WEBHOOK_SECRET);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("base64");

    if (signature !== expectedSignature) {
        return res.status(401).json({ error: "Invalid Signature" });
    }

    console.log("✅ Webhook Verified:", req.body);
    res.status(200).json({ success: true });
}
