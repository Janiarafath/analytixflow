export default function handler(req: any, res: any) {
  res.status(200).json({
    message: 'Hello from Vercel!',
    path: req.url,
    method: req.method,
  });
}
