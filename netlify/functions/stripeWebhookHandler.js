const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

module.exports = async (req, res) => {
  let event;

  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;

    if (email) {
      await admin.firestore().collection('users').doc(email).set({
        subscription: 'active',
        updated: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }

  if (
    event.type === 'customer.subscription.deleted' ||
    event.type === 'invoice.payment_failed'
  ) {
    const subscription = event.data.object;
    const customer = await stripe.customers.retrieve(subscription.customer);
    const email = customer.email;

    if (email) {
      await admin.firestore().collection('users').doc(email).set({
        subscription: 'inactive',
        updated: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }

  res.status(200).send('Event received');
};
