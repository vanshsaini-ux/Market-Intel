// Vercel serverless function: checks whether links found during research are live.
// Uses the same ACCESS_CODES as /api/gemini. Safe-guarded against internal-network requests.

const dns = require('dns').promises;
const net = require('net');

const hits = new Map();
const UNCHECKABLE = [
  'facebook.com', 'fb.com', 'fb.watch', 'instagram.com', 'linkedin.com',
  'x.com', 'twitter.com', 'adstransparency.google.com', 'pinterest.com',
];

const sameSite = (h, d) => h === d || h.endsWith('.' + d);

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:');
  }
  return true;
}

async function safeToFetch(u) {
  if (!/^https?:$/.test(u.protocol)) return false;
  const h = u.hostname;
  if (!h || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (net.isIP(h)) return !isPrivateIp(h);
  try {
    const addrs = await dns.lookup(h, { all: true });
    return addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address));
  } catch {
    return false;
  }
}

async function fetchTimed(url, opts = {}, ms = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function checkOne(raw) {
  let u;
  try { u = new URL(raw); } catch { return { status: 'dead' }; }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();

  // YouTube: oEmbed answers 404 for videos that do not exist.
  if (sameSite(host, 'youtube.com') || host === 'youtu.be') {
    try {
      const r = await fetchTimed('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(u.href));
      if (r.ok) { const j = await r.json().catch(() => ({})); return { status: 'ok', title: j.title || '' }; }
      if (r.status === 404) return { status: 'dead' };
      return { status: 'unchecked' };
    } catch { return { status: 'unchecked' }; }
  }

  // Social and ad-library pages need a logged-in browser; cannot be verified here.
  if (UNCHECKABLE.some((d) => sameSite(host, d))) return { status: 'unchecked' };

  // Everything else: follow up to 3 redirects, re-validating each hop.
  let current = u;
  for (let hop = 0; hop < 4; hop++) {
    if (!(await safeToFetch(current))) return { status: 'unchecked' };
    try {
      const r = await fetchTimed(current.href, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketIntelLinkCheck/1.0)', Accept: 'text/html,*/*' },
      });
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
        try { current = new URL(r.headers.get('location'), current); continue; } catch { return { status: 'unchecked' }; }
      }
      if (r.status === 404 || r.status === 410) return { status: 'dead' };
      if (r.status >= 200 && r.status < 300) {
        let title = '';
        try {
          const text = (await r.text()).slice(0, 60000);
          const m = text.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
          title = m ? m[1].trim() : '';
        } catch {}
        return { status: 'ok', title };
      }
      return { status: 'unchecked' };
    } catch { return { status: 'unchecked' }; }
  }
  return { status: 'unchecked' };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Use POST.' } });

  const codes = (process.env.ACCESS_CODES || '').split(',').map((s) => s.trim()).filter(Boolean);
  const supplied = String(req.headers['x-access-code'] || '').trim();
  if (!codes.length || !supplied || !codes.includes(supplied)) {
    return res.status(401).json({ error: { message: 'Access code not accepted.' } });
  }

  const now = Date.now();
  const recent = (hits.get(supplied) || []).filter((t) => now - t < 60000);
  if (recent.length >= 20) return res.status(429).json({ error: { message: 'Too many checks. Wait a moment.' } });
  recent.push(now);
  hits.set(supplied, recent);

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const urls = Array.isArray(body && body.urls) ? [...new Set(body.urls.map(String))].slice(0, 40) : [];
  if (!urls.length) return res.status(400).json({ error: { message: 'No urls.' } });

  const results = {};
  const queue = [...urls];
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const u = queue.shift();
      results[u] = await checkOne(u);
    }
  }));
  return res.status(200).json({ results });
};
