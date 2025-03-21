import { Client, Environment } from 'square';

// ✅ Initialize Square client
const squareClient = new Client({
  environment: Environment.Production,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { amount, credits, userId } = req.body;
    if (!amount || !credits || !userId) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const amountInCents = Math.round(amount * 100);

    const { result } = await squareClient.checkoutApi.createCheckout(
      process.env.SQUARE_LOCATION_ID,
      {
        idempotencyKey: `trackrepost-${userId}-${Date.now()}`,
        order: {
          order: {
            locationId: process.env.SQUARE_LOCATION_ID,
            lineItems: [
              {
                name: `${credits} Credits`,
                quantity: '1',
                basePriceMoney: {
                  amount: amountInCents,
                  currency: 'CAD',
                },
              },
            ],
            note: userId, // 🔑 Used later by the webhook to apply credits
          },
        },
        redirectUrl: `https://www.trackrepost.com/payment-success?credits=${credits}&userId=${userId}`,
      }
    );

    if (!result || !result.checkout || !result.checkout.checkoutPageUrl) {
      return res
        .status(500)
        .json({ error: 'Square API did not return a valid checkout link.' });
    }

    res.status(200).json({ checkoutUrl: result.checkout.checkoutPageUrl });
  } catch (error) {
    console.error('❌ Square API Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}



