const functions = require('firebase-functions');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICE_ID = functions.config().stripe.price_id;

exports.createCheckoutSession = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send({ error: 'Method Not Allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send({ error: 'Missing email' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      success_url: 'https://mbsgoat.netlify.app/success',
      cancel_url: 'https://mbsgoat.netlify.app/cancel',
      metadata: { email }
    });

    return res.status(200).send({ url: session.url });

  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(500).send({ error: error.message });
  }
};
