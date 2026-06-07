import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import Razorpay from 'razorpay';
import Groq from 'groq-sdk';

const app = express();

app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf.toString(); },
}));

app.use(cors({
  origin: true,
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_NM3kAvMtz1t9bc';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'boEzjW8ugq30i605Yz65tbG0';
const AI_PROVIDER = (process.env.AI_PROVIDER || 'groq').toLowerCase();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

let groqClient = null;
if (AI_PROVIDER === 'groq' && GROQ_API_KEY) {
  groqClient = new Groq({ apiKey: GROQ_API_KEY });
}

const AI_API_KEY = AI_PROVIDER === 'groq' ? GROQ_API_KEY : OPENROUTER_API_KEY;
const AI_BASE_URL =
  AI_PROVIDER === 'groq'
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions';
const AI_MODEL =
  process.env.AI_MODEL ||
  (AI_PROVIDER === 'groq'
    ? 'llama-3.1-8b-instant'
    : 'meta-llama/llama-3.1-8b-instruct:free');

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

app.get('/api/debug', (req, res) => {
  res.json({ url: req.url, method: req.method, rawBody: req.rawBody });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: 'vercel' });
});

app.post('/api/ai/chat', (req, res) => {
  const body = req.body || {};
  const question = body.question;
  if (typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ status: 'error', message: 'Missing question.' });
  }
  if (!groqClient) {
    return res.status(503).json({
      status: 'error',
      message: 'Groq client not initialized. Please check GROQ_API_KEY environment variable.',
    });
  }
  groqClient.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a precise dataset-grounded assistant.' },
      { role: 'user', content: `Q: ${question}\nAnalyze professionally.` },
    ],
    model: AI_MODEL,
    temperature: 0.2,
  }).then(chatCompletion => {
    const answer = chatCompletion.choices[0]?.message?.content?.trim() || '';
    res.json({ status: 'success', answer });
  }).catch(groqError => {
    res.status(502).json({
      status: 'error',
      message: `Groq API error: ${groqError.message || 'Unknown error'}`,
    });
  });
});

app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency, userId } = req.body;
    const order = await razorpay.orders.create({
      amount, currency,
      receipt: `receipt_${userId}_${Date.now()}`,
      notes: { userId },
    });
    res.json({ orderId: order.id });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to create order' });
  }
});

app.post('/api/verify-payment', (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(body.toString()).digest('hex');
    if (expectedSignature === signature) {
      res.json({ status: 'success', message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ status: 'error', message: 'Payment verification failed' });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

app.use((err, req, res, next) => {
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
