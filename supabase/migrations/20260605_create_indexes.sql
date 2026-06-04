-- Create unique indexes required for idempotent upserts

create unique index if not exists uq_providers_proveedor on public.providers (lower(proveedor));
create unique index if not exists uq_zones_zona on public.zones (lower(zona));
create unique index if not exists uq_returns_nombre_ejecutivo on public.returns_sellers (lower(nombre), lower(ejecutivo));
create unique index if not exists uq_sales_daily_fecha_proveedor_vendedor on public.sales_daily ((fecha), lower(proveedor), lower(vendedor));

-- Ensure constraints exist for required columns
alter table if exists public.sales_daily add column if not exists fecha date;
