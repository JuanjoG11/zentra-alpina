import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function checkExpiry() {
  const { data: ecr, error: err1 } = await supabase.from('expiry_client_returns').select('*').eq('periodo', '2026-07');
  console.log('expiry_client_returns 2026-07 count:', ecr ? ecr.length : 0, 'error:', err1 ? err1.message : 'none');
  if (ecr && ecr.length > 0) {
    console.log('Sample expiry_client_returns:', ecr.slice(0, 3));
  }

  const { data: zones, error: err2 } = await supabase.from('zones').select('*').eq('periodo', '2026-07');
  console.log('zones 2026-07 count:', zones ? zones.length : 0);
  if (zones && zones.length > 0) {
    console.log('Sample zone:', zones[0]);
  }
}

checkExpiry();
