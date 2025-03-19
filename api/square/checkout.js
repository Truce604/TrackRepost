import { Client, Environment } from "square";
import { buffer } from "micro";

export const config = {
    api: {
        bodyParser: false, // Required for raw request body
    },
};

export default async function handler(req, res) {
    console.log("🔹 Square Checkout API Hit");

    // ✅ Allow CORS
    res.setHeader("Access-Control-Allow-Origin", "https://www.trackrepost.com");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // ✅ Handle Preflight Requests
    if (req.method === "OPTIONS") {
        console.log("✅ Preflight request handled");
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        console.log("❌ Invalid Method:", req.method);
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    // ✅ Ensure Environment Variables Exist
    if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) {
        console.error("❌ Missing Square API Credentials");
        return res.status(500).json({ error: "Missing Square API Credentials" });
    }

    try {
        // ✅ Initialize Square Client
        console.log("🔹 Initializing Square Client...");
        const squareClient = new Client({
            environment: Environment.Production,
            accessToken: process.env.SQUARE_ACCESS_TOKEN
        });

        const paymentsApi = squareClient.paymentsApi;

        // ✅ Read request body
        const rawBody = await buffer(req);
        const { amount, credits, userId } = JSON.parse(rawBody.toString());

        console.log(`🔹 Received request: ${credits} credits, Amount: $${amount}, User ID: ${userId}`);

        if (!amount || !credits || !userId) {
            console.error("❌ Missing required fields:", { amount, credits, userId });
            return res.status(400).json({ error: "Missing required fields." });
        }

        // ✅ Convert amount to cents (Square API uses cents)
        const amountInCents = Math.round(amount * 100);
        console.log(`🔹 Creating Square checkout for ${credits} credits, Amount: $${amount}`);

        // ✅ Create checkout request
        const { result } = await paymentsApi.createPayment({
            idempotencyKey: `trackrepost-${userId}-${Date.now()}`,
            sourceId: "CASH_APP_PAY",
            amountMoney: {
                amount: amountInCents,
                currency: "USD"
            },
            locationId: process.env.SQUARE_LOCATION_ID
        });

        console.log("🔹 Square API Response:", result);

        if (!result || !result.payment) {
            console.error("❌ Square API did not return a valid payment.");
            return res.status(500).json({ error: "Square API did not return a valid payment." });
        }

        console.log("✅ Square Checkout URL:", result.payment.paymentUrl);
        res.status(200).json({ checkoutUrl: result.payment.paymentUrl });

    } catch (error) {
        console.error("❌ Square API Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
}

