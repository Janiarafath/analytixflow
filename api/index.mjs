import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import Razorpay from 'razorpay';
import Groq from 'groq-sdk';

const app = express();

app.use(cors({
  origin: true,
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      req.rawBody = body;
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch (e) {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
});

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
const AI_BASE_URL = AI_PROVIDER === 'groq'
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions';
const AI_MODEL = process.env.AI_MODEL || (AI_PROVIDER === 'groq' ? 'llama-3.1-8b-instant' : 'meta-llama/llama-3.1-8b-instruct:free');

const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

app.get('/api/health', (req, res) => res.json({ status: 'ok', env: 'vercel' }));

app.post('/api/echo', (req, res) => res.json({ body: req.body, rawBody: req.rawBody }));

app.post('/api/ai/chat', (req, res) => {
  const { question, dataSample, columns } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ status: 'error', message: 'Missing question.' });
  }
  if (!groqClient) {
    return res.status(503).json({ status: 'error', message: 'Groq client not initialized.' });
  }
  const prompt = `Cols: ${JSON.stringify((columns || []).slice(0, 10))}\nSample: ${JSON.stringify((dataSample || []).slice(0, 3))}\nQ: ${question}\nAnalyze professionally.`;
  groqClient.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a precise dataset-grounded assistant.' },
      { role: 'user', content: prompt },
    ],
    model: AI_MODEL,
    temperature: 0.2,
  }).then(chatCompletion => {
    res.json({ status: 'success', answer: chatCompletion.choices[0]?.message?.content?.trim() || '' });
  }).catch(err => {
    res.status(502).json({ status: 'error', message: `Groq API error: ${err.message}` });
  });
});

app.post('/api/create-order', (req, res) => {
  const { amount, currency, userId } = req.body || {};
  razorpay.orders.create({ amount, currency, receipt: `receipt_${userId}_${Date.now()}`, notes: { userId } })
    .then(order => res.json({ orderId: order.id }))
    .catch(() => res.status(500).json({ status: 'error', message: 'Failed to create order' }));
});

app.post('/api/verify-payment', (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body || {};
    const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(orderId + '|' + paymentId).digest('hex');
    res.json({ status: expected === signature ? 'success' : 'error', message: expected === signature ? 'Payment verified' : 'Verification failed' });
  } catch (e) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

app.use((err, req, res, next) => res.status(500).json({ status: 'error', message: 'Internal server error' }));

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

export default app;
