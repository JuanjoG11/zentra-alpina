-- =============================================================
-- FIX: Cambiar constraints únicos para soportar múltiples períodos
-- Ejecutar en Supabase → SQL Editor
-- =============================================================

-- 1. providers: el único debe ser (proveedor, periodo)
ALTER TABLE public.providers DROP CONSTRAINT IF EXISTS uq_providers_proveedor;
ALTER TABLE public.providers DROP CONSTRAINT IF EXISTS providers_proveedor_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_providers_proveedor_periodo
  ON public.providers(proveedor, periodo);

-- 2. zones: el único debe ser (zona, periodo)
ALTER TABLE public.zones DROP CONSTRAINT IF EXISTS uq_zones_zona;
ALTER TABLE public.zones DROP CONSTRAINT IF EXISTS zones_zona_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_zones_zona_periodo
  ON public.zones(zona, periodo);

-- 3. returns_sellers: el único debe ser (nombre, ejecutivo, periodo)
ALTER TABLE public.returns_sellers DROP CONSTRAINT IF EXISTS uq_returns_sellers;
ALTER TABLE public.returns_sellers DROP CONSTRAINT IF EXISTS returns_sellers_nombre_ejecutivo_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_returns_sellers_periodo
  ON public.returns_sellers(nombre, ejecutivo, periodo);

-- 4. sales_daily: el único debe ser (fecha, proveedor, vendedor, periodo)
ALTER TABLE public.sales_daily DROP CONSTRAINT IF EXISTS uq_sales_daily;
ALTER TABLE public.sales_daily DROP CONSTRAINT IF EXISTS sales_daily_fecha_proveedor_vendedor_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_daily_periodo
  ON public.sales_daily(fecha, proveedor, vendedor, periodo);

-- 5. returns_daily: el único debe ser (fecha, periodo)
ALTER TABLE public.returns_daily DROP CONSTRAINT IF EXISTS uq_returns_daily;
ALTER TABLE public.returns_daily DROP CONSTRAINT IF EXISTS returns_daily_fecha_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_returns_daily_periodo
  ON public.returns_daily(fecha, periodo);
