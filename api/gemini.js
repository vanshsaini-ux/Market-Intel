// Vercel serverless function: keeps your Gemini key on the server.
// Env vars (set in Vercel > Project > Settings > Environment Variables):
//   GEMINI_API_KEY  = your Gemini API key (required)
//   ACCESS_CODES    = comma-separated codes, e.g. vansh-2026,teammate-x91 (required)
//   GEMINI_MODEL    = optional default model (falls back to gemini-3.1-pro-preview)

const hits = new Map(); // simple per-code rate limit (per warm instance)
const LIMIT_PER_MIN = 40;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Use POST.' } });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const codes = (process.env.ACCESS_CODES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!apiKey || !codes.length) {
    return res.status(500).json({
      error: { message: 'Server is not configured. Add GEMINI_API_KEY and ACCESS_CODES in Vercel, then redeploy.' },
    });
  }

  const supplied = String(req.headers['x-access-code'] || '').trim();
  if (!supplied || !codes.includes(supplied)) {
    return res.status(401).json({ error: { message: 'Access code not accepted. Open Settings and re-enter it.' } });
  }

  const now = Date.now();
  const recent = (hits.get(supplied) || []).filter((t) => now - t < 60000);
  if (recent.length >= LIMIT_PER_MIN) {
    return res.status(429).json({ error: { message: 'Too many requests this minute. Wait a few seconds and retry.' } });
  }
  recent.push(now);
  hits.set(supplied, recent);

  let payload = req.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { payload = null; }
  }
  if (!payload || typeof payload.body !== 'object') {
    return res.status(400).json({ error: { message: 'Bad request.' } });
  }

  const requested = String(payload.model || '').trim();
  const model = /^gemini-[\w.\-]+$/.test(requested)
    ? requested
    : (process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 57000);

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(payload.body),
      signal: ctrl.signal,
    });
    const text = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (e) {
    const timedOut = e && e.name === 'AbortError';
    return res.status(timedOut ? 504 : 502).json({
      error: {
        message: timedOut
          ? 'Gemini took too long (60s limit). Switch to a faster Flash model in Settings.'
          : 'Could not reach Gemini. Try again.',
      },
    });
  } finally {
    clearTimeout(timer);
  }
};
