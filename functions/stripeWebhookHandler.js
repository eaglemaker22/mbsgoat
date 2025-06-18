const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(functions.config().stripe.secret_key);

const endpointSecret = functions.config().stripe.webhook_secret;

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
    const email = session.metadata.email;

    await admin.firestore().collection('users').doc(email).set({
      subscription: 'active',
      updated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  if (
    event.type === 'customer.subscription.deleted' ||
    event.type === 'invoice.payment_failed'
  ) {
    const session = event.data.object;
    const email = session.metadata?.email;

    if (email) {
      await admin.firestore().collection('users').doc(email).set({
        subscription: 'inactive',
        updated: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }

  res.status(200).send('Event received');
};
