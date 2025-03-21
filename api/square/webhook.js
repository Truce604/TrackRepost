
import crypto from "crypto";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    if (!signatureKey) {
        console.error("❌ Missing Webhook Secret");
        return res.status(400).json({ error: "Missing Webhook Secret" });
    }

    const body = JSON.stringify(req.body);
    const signature = req.headers["x-square-signature"];

    const hmac = crypto.createHmac("sha1", signatureKey);
    hmac.update(body);
    const expectedSignature = hmac.digest("base64");

    if (signature !== expectedSignature) {
        console.error("❌ Invalid Webhook Signature");
        return res.status(401).json({ error: "Invalid Signature" });
    }

    const event = req.body;

    console.log("✅ Verified Webhook Event:", event.type);

    // Handle successful payment event
    if (event.type === "payment.updated" && event.data?.object?.payment?.status === "COMPLETED") {
        const payment = event.data.object.payment;

        console.log("💰 Payment Successful:", payment.id);
        console.log("👤 Buyer Email:", payment?.buyerEmailAddress || "N/A");

        // You can extract the amount or metadata here
        // Then apply credits to the user in Firebase if needed
    }

    res.status(200).json({ success: true });
}

