import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

// Optional local .env loader; never commit real credentials.
try {
  const envText = fs.readFileSync(path.resolve('.env'), 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
} catch {}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

// Pre-seeded demo user and in-memory auth endpoints if called
const serverUsers = [
  {
    name: "Demo User",
    username: "demo",
    email: "demo@raahi.app",
    phone: "9876543210",
    country: "India",
    address: "123 Demo Street, Mumbai, Maharashtra 400001",
    emergency: "9876543211",
    password: "demo123"
  }
];

app.post('/api/login', (req, res) => {
  const { username, email, password } = req.body || {};
  const query = (username || email || '').trim().toLowerCase();
  if (!query || !password) {
    return res.status(400).json({ error: 'Enter your username and password.' });
  }
  const existing = serverUsers.find(u =>
    (u.username && u.username.toLowerCase() === query) ||
    (u.email && u.email.toLowerCase() === query) ||
    (u.name && u.name.toLowerCase() === query)
  );
  if (existing) {
    if (existing.password && existing.password !== password) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }
    return res.json({ ok: true, user: existing });
  }
  const isEmail = query.includes('@');
  const newUser = {
    name: isEmail ? query.split('@')[0] : query,
    username: query,
    email: isEmail ? query : `${query}@raahi.app`,
    password
  };
  serverUsers.push(newUser);
  return res.json({ ok: true, user: newUser });
});

app.post('/api/signup', (req, res) => {
  const profile = req.body || {};
  serverUsers.push(profile);
  return res.json({ ok: true, user: profile });
});

app.get('/api/users', (_req, res) => res.json({ ok: true, users: serverUsers }));

app.post('/api/city-safety', async (req, res) => {
  const { city } = req.body || {};
  if (!city || typeof city !== 'string' || !city.trim()) {
    return res.status(400).json({ error: 'City name is required.' });
  }
  const cleanCity = city.trim();

  // If Gemini API key is configured in process.env
  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = `You are a real-time global travel safety intelligence analyst. Analyze the traveler safety situation for the city "${cleanCity}". Return ONLY a valid JSON object matching:
{
  "city": "${cleanCity}",
  "country": "Country name",
  "flag": "emoji flag",
  "overallScore": 85,
  "verdict": "Safe / Low Risk" or "Moderately Safe / Exercise Caution" or "High Caution Advised",
  "verdictLevel": "safe" or "moderate" or "caution",
  "daySafety": 90,
  "nightSafety": 75,
  "womenSafety": "Assessment for solo and female travelers",
  "soloTravelerRating": "Rating for solo travelers",
  "aiSummary": "2-3 sentences concise safety summary",
  "tipsAndRisks": {
    "transport": "Public transit, taxi and rideshare tips",
    "scamsAndAreas": "Areas or scams to watch out for",
    "habits": "Safe travel habits and etiquette"
  },
  "emergencyNumbers": {
    "police": "local police number",
    "ambulance": "local medical emergency number",
    "general": "general emergency number"
  }
}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        return res.json({ ok: true, report: { ...parsed, source: 'Gemini 2.5 Flash' } });
      }
    } catch (err) {
      console.error('Server Gemini city safety analysis failed:', err.message);
    }
  }

  // If OpenAI API key is configured
  if (process.env.OPENAI_API_KEY) {
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          response_format: { type: "json_object" },
          messages: [
            { role: 'system', content: 'You are an expert global traveler safety analyst. Return structured JSON safety reports for cities with city, country, flag, overallScore, verdict, verdictLevel, daySafety, nightSafety, womenSafety, soloTravelerRating, aiSummary, tipsAndRisks (transport, scamsAndAreas, habits), emergencyNumbers (police, ambulance, general).' },
            { role: 'user', content: `Analyze safety for city "${cleanCity}".` }
          ]
        })
      });
      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return res.json({ ok: true, report: { ...parsed, source: 'OpenAI GPT' } });
      }
    } catch (err) {
      console.error('Server OpenAI city safety analysis failed:', err.message);
    }
  }

  return res.json({ ok: false, useClientFallback: true });
});
const allowedLangs = new Set(['en','hi','mr','bn','ta','te','gu','kn','ml','pa','es','fr','de','ar','pt','ru','ja','zh']);
const attempts = new Map();
app.post('/api/translate', async (req, res) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter(t => now - t < 60_000);
  if (recent.length >= 20) return res.status(429).json({ error: 'Too many translation requests. Please wait a minute.' });
  recent.push(now); attempts.set(ip, recent);
  const { text, source, target } = req.body || {};
  if (typeof text !== 'string' || !text.trim() || text.length > 5000) return res.status(400).json({ error: 'Enter text between 1 and 5000 characters.' });
  if (!allowedLangs.has(source) || !allowedLangs.has(target)) return res.status(400).json({ error: 'Choose a supported source and target language.' });
  if (source === target) return res.json({ translation: text.trim(), provider: 'same-language' });

  // Prefer actual AI translation when the operator configures a server-side OpenAI key.
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.2, messages: [
          { role: 'system', content: `You are a careful travel and safety translator. Translate the user's text from language code ${source} into language code ${target}. Preserve meaning, names, numbers, addresses, and emergency details. Return only the translation, no commentary. If the text is ambiguous, translate faithfully rather than inventing details.` },
          { role: 'user', content: text.trim() }
        ] })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'AI translation provider returned an error.');
      const translation = data.choices?.[0]?.message?.content?.trim();
      if (!translation) throw new Error('AI provider returned an empty translation.');
      return res.json({ translation, provider: 'openai' });
    } catch (error) {
      console.error('AI translation failed:', error.message);
      // Do not silently switch providers after an AI failure; tell the client clearly.
      return res.status(502).json({ error: 'AI translation is temporarily unavailable. Please try again shortly.' });
    }
  }

  // Keyless fallback so translation works before an AI key is configured.
  try {
    const langPair = `${source}|${target}`;
    const url = new URL('https://api.mymemory.translated.net/get');
    url.searchParams.set('q', text.trim()); url.searchParams.set('langpair', langPair);
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    const data = await response.json();
    const translation = data?.responseData?.translatedText;
    if (!response.ok || data?.responseStatus !== 200 || !translation) throw new Error('No translation returned');
    return res.json({ translation: decodeHtml(translation), provider: 'mymemory' });
  } catch {
    return res.status(502).json({ error: 'Translation service is unavailable. Check your internet connection and try again.' });
  }
});
function decodeHtml(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
app.get('/api/health', (_req, res) => res.json({ ok: true, aiConfigured: Boolean(process.env.OPENAI_API_KEY) }));
const port = Number(process.env.API_PORT || 3001);
app.listen(port, '127.0.0.1', () => console.log(`RAAHI translation API listening on http://127.0.0.1:${port}`));
