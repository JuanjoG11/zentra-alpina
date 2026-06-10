// src/services/supabaseClient.js
// Cliente centralizado de Supabase (evita múltiples instancias de GoTrueClient)
import { createClient } from '@supabase/supabase-js';

// Variables de entorno (prefijo VITE_). También aceptamos process.env para scripts Node.
const SUPABASE_URL =
  import.meta?.env?.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined);

// Preferimos la clave anónima para el cliente del navegador; si no existe usamos la Service Role (solo pruebas).
const SUPABASE_ANON_KEY =
  import.meta?.env?.VITE_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined);

// Clave Service Role (para backend o scripts, no se expone al cliente).
const SUPABASE_SERVICE_ROLE_KEY =
  import.meta?.env?.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  (typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined);

// Seleccionamos la clave activa: preferimos Service Role para bypass de RLS en esta plataforma local, si no, Anon.
const ACTIVE_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

// Exportamos una única instancia del cliente (o null si faltan credenciales)
export const supabase = SUPABASE_URL && ACTIVE_KEY ? createClient(SUPABASE_URL, ACTIVE_KEY) : null;

// Helper opcional para asegurar que el bucket "uploads" exista (solo muestra advertencia)
export const ensureUploadsBucket = async () => {
  if (!supabase) return false;
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error al listar los buckets de storage:', error);
    return false;
  }
  const exists = data?.some((b) => b.name === 'uploads');
  if (!exists) {
    console.warn('El bucket "uploads" no existe. Crealo manualmente en el dashboard de Supabase.');
  }
  return exists;
};
