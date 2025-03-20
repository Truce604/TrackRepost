import { Client, Environment } from "square";
import { buffer } from "micro";

export const config = {
    api: {
        bodyParser: false, // Required for raw request body
    },
};

export default async function handler(req, res) {
    console.log("🔹 Square Checkout API Hit");

    // ✅ Fix CORS Policy
    res.setHeader("Access-Control-Allow-Origin", "https://www.trackrepost.com"); 
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

        const checkoutApi = squareClient.checkoutApi;

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
        console.log(`🔹 Creating Square checkout for ${credits} credits, Amount: $${amount} CAD`);

        // ✅ Create Checkout Link
        console.log("🔹 Sending request to Square API...");
        const { result } = await checkoutApi.createPaymentLink({
            idempotencyKey: `trackrepost-${userId}-${Date.now()}`,
            locationId: process.env.SQUARE_LOCATION_ID,
            order: {
                locationId: process.env.SQUARE_LOCATION_ID,
                lineItems: [
                    {
                        name: `${credits} Credits`,
                        quantity: "1",
                        basePriceMoney: {
                            amount: amountInCents,
                            currency: "CAD" // ✅ Fix currency to CAD
                        }
                    }
                ]
            },
            redirectUrl: `https://www.trackrepost.com/payment-success?credits=${credits}&userId=${userId}`
        });

        console.log("🔹 Square API Response:", result);

        if (!result || !result.paymentLink || !result.paymentLink.url) {
            console.error("❌ Square API did not return a valid link");
            return res.status(500).json({ error: "Square API did not return a valid link." });
        }

        console.log("✅ Square Checkout URL:", result.paymentLink.url);
        res.status(200).json({ checkoutUrl: result.paymentLink.url });

    } catch (error) {
        console.error("❌ Square API Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
};
