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

async function checkSellers() {
  const { data, error } = await supabase.from('returns_sellers').select('*').eq('periodo', '2026-07');
  if (error) console.error(error);
  else {
    console.log('returns_sellers count:', data.length);
    data.slice(0, 15).forEach(s => {
      console.log(`${s.ejecutivo} (${s.nombre}): ventas=${s.ventas}, dev=${s.devoluciones}, pct=${s.porcentaje_devolucion || s.porcentajeDevolucion}`);
    });
  }
}

checkSellers();
