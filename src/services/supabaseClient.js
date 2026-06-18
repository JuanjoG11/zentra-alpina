// src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// La VITE_SUPABASE_ANON_KEY es una clave PÚBLICA (publishable) — es seguro incluirla
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || 'https://torxgpnqiezpnqqdomik.supabase.co';

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'sb_publishable_NSH1tlPsBZ_XsC3bbTRtyA_gRGibIur';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
