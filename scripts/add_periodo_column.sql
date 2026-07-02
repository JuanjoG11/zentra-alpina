-- =============================================================
-- MIGRACIÓN: columna 'periodo' — formato YYYY-MM (ej: '2026-06')
-- 
-- Ya corriste el ALTER TABLE + CREATE INDEX previamente.
-- Solo ejecutar el UPDATE si los registros existentes tienen
-- periodo NULL o necesitan ser marcados como junio 2026.
-- =============================================================

-- Marcar registros existentes como junio 2026 (si aún son NULL o tienen el default '2026-06')
UPDATE public.providers       SET periodo = '2026-06' WHERE periodo IS NULL OR periodo = '';
UPDATE public.zones           SET periodo = '2026-06' WHERE periodo IS NULL OR periodo = '';
UPDATE public.returns_sellers SET periodo = '2026-06' WHERE periodo IS NULL OR periodo = '';
UPDATE public.sales_daily     SET periodo = '2026-06' WHERE periodo IS NULL OR periodo = '';
UPDATE public.returns_daily   SET periodo = '2026-06' WHERE periodo IS NULL OR periodo = '';

-- Vista actualizada para comparación entre períodos
CREATE OR REPLACE VIEW public.ventas_por_periodo AS
SELECT
  periodo,
  SUM(ventas)             AS total_ventas,
  COUNT(DISTINCT fecha)   AS dias_con_ventas,
  COUNT(*)                AS total_filas
FROM public.sales_daily
GROUP BY periodo
ORDER BY periodo DESC;
