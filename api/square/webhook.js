export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const event = req.body;

    // Square may send a ping test
    if (event.type === 'payment.updated' && event.data?.object?.payment?.status === 'COMPLETED') {
      const payment = event.data.object.payment;
      const amount = payment.amount_money.amount;
      const orderId = payment.order_id;
      const userId = payment.note; // optional if you store user info here

      console.log("✅ Payment Complete:", { amount, orderId, userId });

      // TODO: Update Firestore credits for the user here

      return res.status(200).json({ message: 'Webhook received successfully' });
    }

    return res.status(200).json({ message: 'Event ignored' });
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

