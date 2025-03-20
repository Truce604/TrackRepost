import { buffer } from "micro";
import crypto from "crypto";

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    console.log("🔹 Square Webhook Hit");

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const rawBody = await buffer(req);
        const signature = req.headers["x-square-hmacsha256-signature"];
        const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET;

        if (!webhookSecret || !signature) {
            console.error("❌ Missing Webhook Secret or Signature");
            return res.status(400).json({ error: "Missing Webhook Secret or Signature" });
        }

        const hash = crypto.createHmac("sha256", webhookSecret)
            .update(rawBody)
            .digest("base64");

        if (hash !== signature) {
            console.error("❌ Webhook Signature Verification Failed");
            return res.status(401).json({ error: "Invalid Webhook Signature" });
        }

        const event = JSON.parse(rawBody.toString());
        console.log("🔹 Webhook Event Received:", event);

        if (event.type === "payment.created") {
            console.log("✅ Payment Created:", event);
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error("❌ Webhook Processing Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
}
