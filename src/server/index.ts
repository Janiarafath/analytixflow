import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import Razorpay from 'razorpay';

const app = express();

// Configure CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'], // Add your frontend URLs
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Add security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const RAZORPAY_KEY_ID = 'rzp_test_NM3kAvMtz1t9bc';
const RAZORPAY_KEY_SECRET = 'boEzjW8ugq30i605Yz65tbG0';

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

// Create order endpoint
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency, userId } = req.body;

    const options = {
      amount,
      currency,
      receipt: `receipt_${userId}_${Date.now()}`,
      notes: {
        userId
      }
    };

    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create order' });
  }
});

// Verify payment endpoint
app.post('/api/verify-payment', (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    // Create a signature using the key secret
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    // Compare signatures
    const isAuthentic = expectedSignature === signature;

    if (isAuthentic) {
      res.json({
        status: 'success',
        message: 'Payment verified successfully'
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});