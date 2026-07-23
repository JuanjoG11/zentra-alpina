-- =============================================================
-- CREAR TABLAS FALTANTES para sincronización completa entre dispositivos
-- Ejecutar en Supabase → SQL Editor
-- =============================================================

-- 1. returns_concepts: conceptos de rechazo con % participación
CREATE TABLE IF NOT EXISTS public.returns_concepts (
  id         BIGSERIAL PRIMARY KEY,
  concepto   TEXT NOT NULL,
  porcentaje NUMERIC(10,4) DEFAULT 0,
  periodo    TEXT NOT NULL DEFAULT '2026-07'
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_returns_concepts_periodo
  ON public.returns_concepts(concepto, periodo);

-- 2. client_returns: devoluciones por cliente (rechazos)
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

-- 3. expiry_concepts: conceptos de cambios por vencimiento
CREATE TABLE IF NOT EXISTS public.expiry_concepts (
  id         BIGSERIAL PRIMARY KEY,
  concepto   TEXT NOT NULL,
  porcentaje NUMERIC(10,4) DEFAULT 0,
  periodo    TEXT NOT NULL DEFAULT '2026-07'
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_expiry_concepts_periodo
  ON public.expiry_concepts(concepto, periodo);

-- 4. expiry_client_returns: cambios por vencimiento por cliente
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

-- 5. product_distrib: distribución numérica de productos por zona/vendedor
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
