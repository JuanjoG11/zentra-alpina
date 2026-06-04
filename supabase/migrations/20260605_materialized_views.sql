-- Materialized views for fast KPIs

create materialized view if not exists mv_kpis_summary as
select
  sum(v.valor) as total_sales,
  sum(case when v.tipo_pago = 'CONTADO' then v.valor else 0 end) as ventas_contado,
  sum(case when v.tipo_pago = 'CREDITO' then v.valor else 0 end) as ventas_credito,
  count(distinct v.vendedor) as vendedores_count,
  count(distinct v.proveedor) as proveedores_count,
  max(v.fecha) as last_date
from public.ventas v;

create index if not exists idx_mv_kpis_lastdate on mv_kpis_summary (last_date);

-- Refresh schedule should be created externally (cron or Supabase scheduled function)
