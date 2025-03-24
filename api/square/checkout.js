import squarePkg from "square";
const Client = squarePkg.default;

// ✅ Log environment variables to verify they're loaded
console.log("🧪 ENV CHECK:", {
  ACCESS_TOKEN_PRESENT: process.env.SQUARE_ACCESS_TOKEN ? "✅" : "❌ MISSING",
  LOCATION_ID: process.env.SQUARE_LOCATION_ID,
  APP_ID: process.env.SQUARE_APPLICATION_ID,
});

const squareClient = new Client({
  environment: "production", // or "sandbox" for testing
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

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
    const idempotencyKey = `trackrepost-${userId}-${Date.now()}`;

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
        note: `${credits} Credits Purchase for userId=${userId}`,
      }
    );

    if (!result.checkout?.checkoutPageUrl) {
      console.error("❌ No checkout URL returned:", result);
      return res
        .status(500)
        .json({ error: "Square API did not return a valid checkout link." });
    }

    res.status(200).json({ checkoutUrl: result.checkout.checkoutPageUrl });
  } catch (error) {
    console.error("❌ Square Checkout Error:", {
      message: error.message,
      stack: error.stack,
      full: error
    });
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}
