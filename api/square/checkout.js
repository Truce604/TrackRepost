import { Client, Environment } from "square";
import { buffer } from "micro";

// ✅ Load Square API credentials from environment variables
const squareClient = new Client({
    environment: Environment.Production, // Change to Environment.Sandbox for testing
    accessToken: process.env.SQUARE_ACCESS_TOKEN
});

const checkoutApi = squareClient.checkoutApi;

export const config = {
    api: {
        bodyParser: false, // Required for raw request body
    },
};

export default async function handler(req, res) {
    // ✅ Allow CORS (Fixing "Blocked by CORS Policy" Error)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // ✅ Handle Preflight Requests (Required for CORS Fix)
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const rawBody = await buffer(req);
        const { amount, credits, userId } = JSON.parse(rawBody.toString());

        if (!amount || !credits || !userId) {
            console.error("❌ Missing required fields:", { amount, credits, userId });
            return res.status(400).json({ error: "Missing required fields." });
        }

        // ✅ Convert amount to cents (Square API uses cents)
        const amountInCents = Math.round(amount * 100);

        console.log(`🔹 Creating Square payment link for ${credits} credits, amount: $${amount}`);

        // ✅ Create checkout request
        const { result } = await checkoutApi.createPaymentLink({
            idempotencyKey: `trackrepost-${userId}-${Date.now()}`,
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
            prePopulatedData: {
                buyerEmail: `${userId}@trackrepost.com`
            }
        });

        console.log("🔹 Full Square API Response:", result);

        if (!result || !result.paymentLink || !result.paymentLink.url) {
            console.error("❌ Square did not return a valid payment link:", result);
            return res.status(500).json({ error: "Square did not return a valid payment link." });
        }

        console.log("✅ Square Checkout URL:", result.paymentLink.url);
        res.status(200).json({ checkoutUrl: result.paymentLink.url });

    } catch (error) {
        console.error("❌ Square API Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
}

