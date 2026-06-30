import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    env[key] = val;
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tables = ['providers', 'zones', 'returns_sellers', 'sales_daily', 'returns_daily'];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`Error checking table ${t}:`, error.message);
    } else {
      console.log(`Table ${t} has ${count} rows`);
    }
  }
  
  // Let's also check one row of sales_daily to see what dates look like
  const { data, error } = await supabase.from('sales_daily').select('*').limit(5);
  if (error) {
    console.error('Error fetching sales_daily rows:', error.message);
  } else {
    console.log('Sample sales_daily rows:', data);
  }
}

check();
