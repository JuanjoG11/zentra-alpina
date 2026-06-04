-- Migration: create ETL tables for Alpina data

create table if not exists public.providers (
  id serial primary key,
  proveedor text,
  ventas2026 numeric,
  ventas2025 numeric,
  margen2026 numeric,
  meta numeric,
  created_at timestamptz default now()
);

create table if not exists public.zones (
  id serial primary key,
  zona text,
  presupuesto numeric,
  facturas integer,
  ventasNetas numeric,
  created_at timestamptz default now()
);

create table if not exists public.returns_sellers (
  id serial primary key,
  nombre text,
  ejecutivo text,
  ventas numeric,
  devoluciones numeric,
  created_at timestamptz default now()
);

create table if not exists public.sales_daily (
  id serial primary key,
  fecha date,
  proveedor text,
  zona text,
  vendedor text,
  ventas numeric,
  unidades integer,
  created_at timestamptz default now()
);

-- Indexes for faster queries
create index if not exists idx_providers_proveedor on public.providers(proveedor);
create index if not exists idx_zones_zona on public.zones(zona);
create index if not exists idx_returns_ejecutivo on public.returns_sellers(ejecutivo);
create index if not exists idx_sales_daily_fecha on public.sales_daily(fecha);
