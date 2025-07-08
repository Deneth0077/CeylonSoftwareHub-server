import express from 'express';
import Stripe from 'stripe';
import Order from '../models/Order.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Create payment intent
router.post('/create-payment-intent', authenticate, async (req, res) => {
  try {
    console.log('Loaded Stripe Secret Key:', process.env.STRIPE_SECRET_KEY);
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { orderId } = req.body;
    console.log('Received orderId:', orderId);

    const order = await Order.findById(orderId);
    if (!order) {
      console.log('Order not found');
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order
    if (order.user.toString() !== req.user._id.toString()) {
      console.log('Access denied: user does not own order');
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log('Order found:', order);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber
      }
    });

    // Update order with payment intent
    order.stripePaymentIntent = paymentIntent.id;
    await order.save();

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Confirm payment
router.post('/confirm-payment', authenticate, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      const order = await Order.findById(paymentIntent.metadata.orderId);
      if (order) {
        order.paymentStatus = 'paid';
        order.orderStatus = 'processing';
        await order.save();
      }
    }

    res.json({ success: true, paymentIntent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    // Update order status
    const order = await Order.findById(paymentIntent.metadata.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      order.orderStatus = 'processing';
      await order.save();
    }
  }

  res.json({ received: true });
});

export default router;