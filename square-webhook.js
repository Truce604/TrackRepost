import { buffer } from 'micro';

export const config = {
  api: {
    bodyParser: false, // Required for raw request body
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const rawBody = await buffer(req);
    const event = JSON.parse(rawBody.toString());

    if (event.type === 'payment.created') {
      const { id, amount_money, customer_id } = event.data.object.payment;

      // TODO: Fetch user by customer_id in Firebase and update their credits
      console.log(`Payment Received: ${id}, Amount: ${amount_money.amount}`);

      return res.status(200).json({ received: true });
    } else {
      return res.status(400).json({ error: 'Unhandled event type' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
}
