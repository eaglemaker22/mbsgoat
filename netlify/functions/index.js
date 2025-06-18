const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripeWebhookHandler = require('./stripeWebhookHandler');
const { createCheckoutSession } = require('./createCheckoutSession');

admin.initializeApp();

exports.createCheckoutSession = functions.https.onRequest(createCheckoutSession);
exports.handleStripeWebhook = functions.https.onRequest(stripeWebhookHandler);
