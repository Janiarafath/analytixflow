import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import Groq from 'groq-sdk';

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

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_NM3kAvMtz1t9bc';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'boEzjW8ugq30i605Yz65tbG0';
const AI_PROVIDER = (process.env.AI_PROVIDER || 'groq').toLowerCase();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// Initialize Groq client if using Groq
let groqClient: Groq | null = null;
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
  key_secret: RAZORPAY_KEY_SECRET
});

// AI endpoint (server-side key, no browser exposure)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { question, dataSample, columns, dataProfile } = req.body || {};
    if (typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ status: 'error', message: 'Missing question.' });
    }

    const safeColumns = Array.isArray(columns) ? columns.slice(0, 20) : [];
    const safeSample = Array.isArray(dataSample) ? dataSample.slice(0, 5) : [];
    const safeProfile = Array.isArray(dataProfile) ? dataProfile.slice(0, 20) : [];

    const prompt = `Cols: ${JSON.stringify(safeColumns.slice(0, 10))}
Sample: ${JSON.stringify(safeSample.slice(0, 3))}
Q: ${question}
Analyze professionally. Give findings, analysis, recommendations. Use markdown.`;

    let answer = '';

    if (AI_PROVIDER === 'groq') {
      if (!groqClient) {
        return res.status(503).json({
          status: 'error',
          message: 'Groq client not initialized. Please check GROQ_API_KEY environment variable.',
        });
      }

      try {
        const chatCompletion = await groqClient.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are a precise dataset-grounded assistant.' },
            { role: 'user', content: prompt },
          ],
          model: AI_MODEL,
          temperature: 0.2,
        });
        answer = chatCompletion.choices[0]?.message?.content?.trim() || '';
      } catch (groqError: any) {
        console.error('Groq API error:', groqError);
        return res.status(502).json({
          status: 'error',
          message: `Groq API error: ${groqError.message || 'Unknown error'}`,
          details: groqError.toString(),
        });
      }
    } else {
      // Fallback to OpenRouter or other providers
      if (!AI_API_KEY) {
        return res.status(503).json({
          status: 'error',
          message: `AI is not configured on the server (missing key for provider: ${AI_PROVIDER}).`,
        });
      }

      const aiResp = await fetch(AI_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_API_KEY}`,
          ...(AI_PROVIDER === 'openrouter'
            ? {
                'HTTP-Referer': 'http://localhost:5173',
                'X-Title': 'AnalytixFlow',
              }
            : {}),
        },
        body: JSON.stringify({
          model: AI_MODEL,
          temperature: 0.2,
          messages: [
            { role: 'system', content: 'You are a precise dataset-grounded assistant.' },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!aiResp.ok) {
        const text = await aiResp.text();
        return res.status(502).json({
          status: 'error',
          message: `Upstream AI error (${AI_PROVIDER}): ${aiResp.status}`,
          details: text,
        });
      }

      const json = await aiResp.json();
      answer = json?.choices?.[0]?.message?.content?.trim() || '';
    }

    return res.json({ status: 'success', answer });
  } catch (error) {
    console.error('AI endpoint error:', error);
    return res.status(500).json({ status: 'error', message: 'AI request failed.' });
  }
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