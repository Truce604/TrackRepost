
import { buffer } from "micro";

export const config = { api: { bodyParser: false } };

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
        const event = JSON.parse(rawBody.toString());

        console.log("🔹 Webhook Event Received:", event);

        res.status(200).json({ success: true });

    } catch (error) {
        console.error("❌ Webhook Processing Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
}
