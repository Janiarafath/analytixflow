import express from 'express';

const app = express();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.all('/api/*', (req, res) => {
  res.json({ path: req.path, method: req.method });
});

app.get('*', (req, res) => {
  res.send('Hello from Express on Vercel');
});

export default app;
