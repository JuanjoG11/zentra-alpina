import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Cargar .env manualmente (Node no lo carga automático)
const __dir = dirname(fileURLToPath(import.meta.url));
try {
  const envPath = resolve(__dir, '../.env');
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...vals] = trimmed.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
  console.log('.env cargado correctamente');
} catch (e) {
  console.warn('No se pudo cargar .env:', e.message);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── Rate limiter simple: máx 1 request cada 5 segundos ────────────────────────
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 5000;

const waitIfNeeded = async () => {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    const wait = MIN_INTERVAL_MS - elapsed;
    console.log(`[Rate] Esperando ${wait}ms antes de llamar a Gemini...`);
    await new Promise(r => setTimeout(r, wait));
  }
  lastRequestTime = Date.now();
};

// ── Salud ──────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Proxy Gemini ───────────────────────────────────────────────────────────────
// El browser no puede usar keys AQ. directamente (CORS + OAuth).
// Este endpoint corre en Node donde el SDK funciona perfectamente.
app.post('/api/gemini', async (req, res) => {
  const { systemPrompt, contents } = req.body;

  const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en el servidor' });
  }

  const MODEL_CASCADE = [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
  ];

  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

  // Esperar si la última request fue hace menos de 5 segundos
  await waitIfNeeded();

  for (const model of MODEL_CASCADE) {
    try {
      const result = await ai.models.generateContent({
        model,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 800,
        },
        contents
      });
      const text = result.text || '';
      console.log(`[Gemini] ${model} OK — ${text.length} chars`);
      return res.json({ text, model });
    } catch (err) {
      const msg = err.message || '';
      const isQuota = msg.includes('429') || msg.includes('quota') ||
                      msg.includes('RESOURCE_EXHAUSTED') || msg.includes('503') ||
                      msg.includes('UNAVAILABLE');
      if (isQuota) {
        console.warn(`[Gemini] ${model} sin quota, esperando 3s...`);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      console.error(`[Gemini] ${model} error:`, msg.substring(0, 200));
      return res.status(500).json({ error: msg.substring(0, 300) });
    }
  }

  return res.status(429).json({ error: 'Gemini ocupado. Intenta en unos segundos.' });
});

// ── ETL ────────────────────────────────────────────────────────────────────────
app.get('/run-etl', async (req, res) => {
  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    res.json({ success: true, message: 'ETL processed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
  console.log(`Gemini proxy: POST http://localhost:${PORT}/api/gemini`);
});
