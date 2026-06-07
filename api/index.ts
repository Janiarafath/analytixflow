import express from 'express';
import path from 'path';

const app = express();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.all('/api/*', (req, res) => {
  res.json({ path: req.path, method: req.method });
});

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
