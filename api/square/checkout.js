import Square from "square";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const { amount, credits } = req.body;

        const squareClient = new Square.Client({
            accessToken: process.env.SQUARE_ACCESS_TOKEN,
            environment: "sandbox", // Change to "production" when live
        });

        const checkout = await squareClient.checkoutApi.createPaymentLink({
            order: {
                lineItems: [
                    {
                        name: `${credits} Credits`,
                        quantity: "1",
                        basePriceMoney: { amount: amount * 100, currency: "USD" },
                    },
                ],
            },
        });

        res.status(200).json({ checkoutUrl: checkout.result.paymentLink.url });
    } catch (error) {
        console.error("❌ Square API Error:", error);
        res.status(500).json({ error: "Failed to create checkout link." });
    }
}
