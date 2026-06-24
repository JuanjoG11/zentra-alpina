// Vercel Serverless Function — proxy para Gemini
// Se despliega automáticamente en https://zentra-alpina.vercel.app/api/gemini
import { GoogleGenAI } from '@google/genai';

const MODEL_CASCADE = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
];

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS para permitir llamadas desde el frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { systemPrompt, contents } = req.body || {};
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en Vercel' });
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

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
      return res.status(200).json({ text, model });
    } catch (err) {
      const msg = err.message || '';
      const isQuota = msg.includes('429') || msg.includes('quota') ||
                      msg.includes('RESOURCE_EXHAUSTED') || msg.includes('503');
      if (isQuota) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      return res.status(500).json({ error: msg.substring(0, 300) });
    }
  }

  return res.status(429).json({ error: 'Gemini ocupado. Intenta en unos segundos.' });
}
