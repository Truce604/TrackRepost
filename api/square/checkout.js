import { Client, Environment } from "square";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { amount, credits, userId } = req.body;
    if (!amount || !credits || !userId) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    const squareClient = new Client({
        environment: Environment.Production,
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
    });

    try {
        const amountInCents = Math.round(amount * 100);
        const checkoutApi = squareClient.checkoutApi;

        const response = await checkoutApi.createCheckout(process.env.SQUARE_LOCATION_ID, {
            idempotencyKey: `trackrepost-${userId}-${Date.now()}`,
            order: {
                locationId: process.env.SQUARE_LOCATION_ID,
                lineItems: [
                    {
                        name: `${credits} Credits`,
                        quantity: "1",
                        basePriceMoney: {
                            amount: amountInCents,
                            currency: "CAD"
                        }
                    }
                ]
            },
            redirectUrl: `https://www.trackrepost.com/payment-success?credits=${credits}&userId=${userId}`
        });

        const checkoutUrl = response.result.checkout.checkoutPageUrl;
        return res.status(200).json({ checkoutUrl });

    } catch (error) {
        console.error("❌ Square API Error:", error);
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
}
