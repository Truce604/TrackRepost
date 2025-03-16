import { Client, Environment } from "square";

// ✅ Initialize Square Client
const squareClient = new Client({
    environment: Environment.Production, // Change to .Sandbox for testing
    accessToken: process.env.SQUARE_ACCESS_TOKEN, // Store in Vercel ENV
});

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { token, amount } = req.body;

        const response = await squareClient.paymentsApi.createPayment({
            sourceId: token,
            amountMoney: {
                amount: amount * 100, // Convert to cents
                currency: "USD",
            },
            idempotencyKey: new Date().getTime().toString(),
        });

        res.json({ success: true, credits: amount });
    } catch (error) {
        console.error("❌ Square Payment Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
}
