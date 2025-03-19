import { Client, Environment } from "square";
import { buffer } from "micro";

export const config = {
    api: {
        bodyParser: false, // Required for raw request body
    },
};

export default async function handler(req, res) {
    console.log("🔹 Square Checkout API Hit");

    // ✅ Fix CORS Policy (Allowing API Requests)
    res.setHeader("Access-Control-Allow-Origin", "*"); // Temporarily allow all origins for debugging
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
            environment: Environment.Production, // Change to Sandbox for testing
            accessToken: process.env.SQUARE_ACCESS_TOKEN
        });

        const ordersApi = squareClient.ordersApi;
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
        console.log(`🔹 Creating Square checkout for ${credits} credits, Amount: $${amount}`);

        // ✅ Create Order
        const { result: orderResult } = await ordersApi.createOrder({
            order: {
                locationId: process.env.SQUARE_LOCATION_ID,
                lineItems: [
                    {
                        name: `${credits} Credits`,
                        quantity: "1",
                        basePriceMoney: {
                            amount: amountInCents,
                            currency: "USD"
                        }
                    }
                ]
            },
            idempotencyKey: `trackrepost-${userId}-${Date.now()}`
        });

        if (!orderResult || !orderResult.order) {
            console.error("❌ Failed to create Square Order");
            return res.status(500).json({ error: "Failed to create Square Order." });
        }

        console.log("✅ Order Created:", orderResult.order.id);

        // ✅ Create Checkout URL
        const { result: checkoutResult } = await checkoutApi.createPaymentLink({
            orderId: orderResult.order.id,
            idempotencyKey: `checkout-${userId}-${Date.now()}`
        });

        if (!checkoutResult || !checkoutResult.paymentLink || !checkoutResult.paymentLink.url) {
            console.error("❌ Square API did not return a valid payment link");
            return res.status(500).json({ error: "Square API did not return a valid payment link." });
        }

        console.log("✅ Square Checkout URL:", checkoutResult.paymentLink.url);
        res.status(200).json({ checkoutUrl: checkoutResult.paymentLink.url });

    } catch (error) {
        console.error("❌ Square API Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
};

