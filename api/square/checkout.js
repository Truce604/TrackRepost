import { Client, Environment } from "square";
import { buffer } from "micro";

// ✅ Ensure environment variables are set
if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) {
    console.error("❌ Missing Square API credentials.");
    throw new Error("Missing Square API credentials. Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID.");
}

// ✅ Initialize Square Client
const squareClient = new Client({
    environment: Environment.Production, // ✅ Make sure we are in PRODUCTION mode
    accessToken: process.env.SQUARE_ACCESS_TOKEN
});

const checkoutApi = squareClient.checkoutApi;

export const config = {
    api: {
        bodyParser: false, // ✅ Required for raw request body
    },
};

export default async function handler(req, res) {
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

        // ✅ Ensure `checkoutApi` is defined
        if (!checkoutApi) {
            console.error("❌ Square Checkout API is not initialized.");
            return res.status(500).json({ error: "Square Checkout API is not initialized." });
        }

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

        // ✅ Ensure Square API returned a valid link
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
