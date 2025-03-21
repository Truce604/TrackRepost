import { Client, Environment } from "square";

const squareClient = new Client({
  environment: Environment.Production,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

const paymentLinksApi = squareClient.paymentLinksApi;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { amount, credits, userId } = req.body;
    if (!amount || !credits || !userId) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const amountInCents = Math.round(amount * 100);

    const { result } = await paymentLinksApi.createPaymentLink({
      idempotencyKey: `trackrepost-${userId}-${Date.now()}`,
      quickPay: {
        name: `${credits} Credits`,
        priceMoney: {
          amount: amountInCents,
          currency: "CAD",
        },
        locationId: process.env.SQUARE_LOCATION_ID,
      },
      redirectUrl: `https://www.trackrepost.com/payment-success?credits=${credits}&userId=${userId}`,
    });

    if (!result || !result.paymentLink || !result.paymentLink.url) {
      return res
        .status(500)
        .json({ error: "Square API did not return a valid link." });
    }

    res.status(200).json({ checkoutUrl: result.paymentLink.url });
  } catch (error) {
    console.error("❌ Square API Error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}

