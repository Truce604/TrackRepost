export default async function handler(req, res) {
    console.log("🔹 Square Checkout API Hit");

    // ✅ Allow CORS for both production & development
    res.setHeader("Access-Control-Allow-Origin", "*"); // Temporarily allow all origins
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // ✅ Handle Preflight Requests
    if (req.method === "OPTIONS") {
        console.log("✅ Preflight request handled");
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        console.log("❌ Invalid Method:", req.method);
        return res.status(405).json({ error: "Method Not Allowed" });
    }


