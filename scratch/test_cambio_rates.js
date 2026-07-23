import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function testEstimatedCambioRates() {
  const { data } = await supabase.from('returns_sellers').select('*').eq('periodo', '2026-07');
  console.log('--- ESTIMATED CAMBIO RATES PER ZONE ---');
  data.forEach(s => {
    const rate = s.ventas > 0 ? (s.devoluciones * 0.45) / s.ventas : 0.015;
    const pctStr = (rate * 100).toFixed(1).replace('.', ',') + '%';
    console.log(`Zona ${s.ejecutivo} (${s.nombre}): rate = ${pctStr} (total dev = ${(s.devoluciones/s.ventas*100).toFixed(1)}%)`);
  });
}

testEstimatedCambioRates();
