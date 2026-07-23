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

async function checkAllPeriods() {
  const { data: ecr } = await supabase.from('expiry_client_returns').select('periodo').limit(100);
  console.log('expiry_client_returns periods:', ecr ? Array.from(new Set(ecr.map(r => r.periodo))) : 'none');

  const { data: cr } = await supabase.from('client_returns').select('periodo, concepto, valor, ejecutivo').limit(100);
  console.log('client_returns count:', cr ? cr.length : 0);
  if (cr && cr.length > 0) {
    console.log('Sample client_returns:', cr.slice(0, 5));
  }
}

checkAllPeriods();
