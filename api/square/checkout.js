import { Client, Environment } from "@square/square";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        if (!process.env.SQUARE_ACCESS_TOKEN) {
            console.error("❌ Missing Square API Key!");
            return res.status(500).json({ error: "Square API Key not configured." });
        }

        const squareClient = new Client({
            accessToken: process.env.SQUARE_ACCESS_TOKEN,
            environment: Environment.SANDBOX, // Change to Environment.PRODUCTION when live
        });

        const { amount, credits } = req.body;

        if (!amount || !credits) {
            return res.status(400).json({ error: "Missing amount or credits." });
        }

        const { result } = await squareClient.checkoutApi.createPaymentLink({
            order: {
                locationId: process.env.SQUARE_LOCATION_ID, // Ensure this is set in Vercel
                lineItems: [
                    {
                        name: `${credits} Credits`,
                        quantity: "1",
                        basePriceMoney: { amount: amount * 100, currency: "USD" },
                    },
                ],
            },
        });

        console.log("✅ Checkout Link Created:", result.paymentLink.url);
        res.status(200).json({ checkoutUrl: result.paymentLink.url });

    } catch (error) {
        console.error("❌ Square API Error:", error);
        res.status(500).json({ error: "Failed to create checkout link.", details: error.message });
    }
}

