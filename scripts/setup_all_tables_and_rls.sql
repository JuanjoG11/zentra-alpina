-- =============================================================
-- SCRIPT COMPLETO DE CONFIGURACIÓN DE TABLAS Y PERMISOS RLS
-- Copiar y ejecutar en Supabase -> SQL Editor
-- =============================================================

-- 1. TABLA: returns_concepts
CREATE TABLE IF NOT EXISTS public.returns_concepts (
  id         BIGSERIAL PRIMARY KEY,
  concepto   TEXT NOT NULL,
  porcentaje NUMERIC(10,4) DEFAULT 0,
  periodo    TEXT NOT NULL DEFAULT '2026-07'
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_returns_concepts_periodo
  ON public.returns_concepts(concepto, periodo);

-- 2. TABLA: client_returns
CREATE TABLE IF NOT EXISTS public.client_returns (
  id        BIGSERIAL PRIMARY KEY,
  ejecutivo TEXT,
  cliente   TEXT NOT NULL,
  concepto  TEXT,
  valor     NUMERIC(18,2) DEFAULT 0,
  periodo   TEXT NOT NULL DEFAULT '2026-07'
);
CREATE INDEX IF NOT EXISTS idx_client_returns_periodo
  ON public.client_returns(periodo);

-- 3. TABLA: expiry_concepts
CREATE TABLE IF NOT EXISTS public.expiry_concepts (
  id         BIGSERIAL PRIMARY KEY,
  concepto   TEXT NOT NULL,
  porcentaje NUMERIC(10,4) DEFAULT 0,
  periodo    TEXT NOT NULL DEFAULT '2026-07'
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_expiry_concepts_periodo
  ON public.expiry_concepts(concepto, periodo);

-- 4. TABLA: expiry_client_returns
CREATE TABLE IF NOT EXISTS public.expiry_client_returns (
  id        BIGSERIAL PRIMARY KEY,
  ejecutivo TEXT,
  cliente   TEXT NOT NULL,
  concepto  TEXT,
  valor     NUMERIC(18,2) DEFAULT 0,
  periodo   TEXT NOT NULL DEFAULT '2026-07'
);
CREATE INDEX IF NOT EXISTS idx_expiry_client_returns_periodo
  ON public.expiry_client_returns(periodo);

-- 5. TABLA: product_distrib
CREATE TABLE IF NOT EXISTS public.product_distrib (
  id             BIGSERIAL PRIMARY KEY,
  nb_producto    TEXT,
  nm_producto    TEXT,
  tp_producto    TEXT,
  nm_tp_marca    TEXT,
  nm_tp_familia  TEXT,
  zona           TEXT,
  vendedor       TEXT,
  ventas         NUMERIC(18,2) DEFAULT 0,
  facturas       INTEGER DEFAULT 0,
  unidades       INTEGER DEFAULT 0,
  clientes_count INTEGER DEFAULT 0,
  participacion  NUMERIC(10,4) DEFAULT 0,
  peso_total     NUMERIC(18,4) DEFAULT 0,
  periodo        TEXT NOT NULL DEFAULT '2026-07'
);
CREATE INDEX IF NOT EXISTS idx_product_distrib_periodo
  ON public.product_distrib(periodo);
CREATE INDEX IF NOT EXISTS idx_product_distrib_producto
  ON public.product_distrib(nb_producto, periodo);

-- 6. TABLA: city_clients
CREATE TABLE IF NOT EXISTS public.city_clients (
  id       BIGSERIAL PRIMARY KEY,
  ciudad   TEXT NOT NULL,
  clientes INTEGER DEFAULT 0,
  periodo  TEXT NOT NULL DEFAULT '2026-07'
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_city_clients_periodo
  ON public.city_clients(ciudad, periodo);

-- =============================================================
-- DESHABILITAR RLS Y ASIGNAR PERMISOS DE LECTURA/ESCRITURA
-- =============================================================
ALTER TABLE public.returns_concepts      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_returns        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expiry_concepts       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expiry_client_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_distrib       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_clients          DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.returns_concepts      TO anon, authenticated;
GRANT ALL ON public.client_returns        TO anon, authenticated;
GRANT ALL ON public.expiry_concepts       TO anon, authenticated;
GRANT ALL ON public.expiry_client_returns TO anon, authenticated;
GRANT ALL ON public.product_distrib       TO anon, authenticated;
GRANT ALL ON public.city_clients          TO anon, authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
