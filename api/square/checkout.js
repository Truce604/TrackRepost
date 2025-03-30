import { Client, Environment } from "square";

const squareClient = new Client({
  environment: Environment.Production,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { amount, credits, userId, plan } = req.body;

    if (!amount || !credits || !userId) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const amountInCents = Math.round(amount * 100);
    const idempotencyKey = `trackrepost-${userId}-${Date.now()}`;

    const note = `${credits} Credits Purchase for userId=${userId}${plan ? ` Plan=${plan}` : ""}`;

    const { result } = await squareClient.checkoutApi.createCheckout(
      process.env.SQUARE_LOCATION_ID,
      {
        idempotencyKey,
        order: {
          order: {
            locationId: process.env.SQUARE_LOCATION_ID,
            lineItems: [
              {
                name: `${credits} Credits`,
                quantity: "1",
                basePriceMoney: {
                  amount: amountInCents,
                  currency: "CAD",
                },
              },
            ],
          },
        },
        redirectUrl: `https://www.trackrepost.com/payment-success?credits=${credits}&userId=${userId}`,
        note,
      }
    );

    const checkoutUrl = result?.checkout?.checkoutPageUrl;

    if (!checkoutUrl) {
      return res.status(500).json({ error: "No checkout URL returned." });
    }

    res.status(200).json({ checkoutUrl });
  } catch (error) {
    console.error("❌ Checkout Error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}





