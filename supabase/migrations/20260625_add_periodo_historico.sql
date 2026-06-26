-- Migración: agregar columna periodo para histórico multi-mes
-- Permite guardar datos de varios meses sin sobreescribir

-- Agregar columna periodo a todas las tablas
ALTER TABLE public.providers      ADD COLUMN IF NOT EXISTS periodo text DEFAULT '2026-06';
ALTER TABLE public.zones          ADD COLUMN IF NOT EXISTS periodo text DEFAULT '2026-06';
ALTER TABLE public.returns_sellers ADD COLUMN IF NOT EXISTS periodo text DEFAULT '2026-06';
ALTER TABLE public.sales_daily    ADD COLUMN IF NOT EXISTS periodo text DEFAULT '2026-06';
ALTER TABLE public.returns_daily  ADD COLUMN IF NOT EXISTS periodo text DEFAULT '2026-06';

-- Índices para queries por periodo
CREATE INDEX IF NOT EXISTS idx_providers_periodo       ON public.providers(periodo);
CREATE INDEX IF NOT EXISTS idx_zones_periodo           ON public.zones(periodo);
CREATE INDEX IF NOT EXISTS idx_returns_sellers_periodo ON public.returns_sellers(periodo);
CREATE INDEX IF NOT EXISTS idx_sales_daily_periodo     ON public.sales_daily(periodo);
CREATE INDEX IF NOT EXISTS idx_returns_daily_periodo   ON public.returns_daily(periodo);

-- Vista para comparación entre periodos (útil para gráficas YoY)
CREATE OR REPLACE VIEW public.ventas_por_periodo AS
SELECT 
  periodo,
  SUM(ventas) as total_ventas,
  COUNT(DISTINCT fecha) as dias_con_ventas,
  COUNT(*) as total_filas
FROM public.sales_daily
GROUP BY periodo
ORDER BY periodo DESC;
