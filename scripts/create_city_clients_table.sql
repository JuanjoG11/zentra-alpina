-- =============================================================
-- TABLA: city_clients — clientes únicos por ciudad
-- Ejecutar en Supabase → SQL Editor
-- =============================================================

CREATE TABLE IF NOT EXISTS public.city_clients (
  id       BIGSERIAL PRIMARY KEY,
  ciudad   TEXT NOT NULL,
  clientes INTEGER DEFAULT 0,
  periodo  TEXT NOT NULL DEFAULT '2026-07'
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_city_clients_periodo
  ON public.city_clients(ciudad, periodo);

-- Acceso público (sin RLS)
ALTER TABLE public.city_clients DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.city_clients TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.city_clients_id_seq TO anon, authenticated;
