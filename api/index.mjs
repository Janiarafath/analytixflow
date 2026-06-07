export default function handler(req, res) {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString();
    res.status(200).json({
      method: req.method,
      url: req.url,
      body: body || '(empty)',
    });
  });
}
