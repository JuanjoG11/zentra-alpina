-- Tabla de devoluciones diarias agregadas
create table if not exists public.returns_daily (
  id          serial primary key,
  fecha       date        not null,
  devoluciones numeric     not null default 0,
  created_at  timestamptz default now()
);

create unique index if not exists uq_returns_daily_fecha
  on public.returns_daily (fecha);

create index if not exists idx_returns_daily_fecha
  on public.returns_daily (fecha);

-- RLS: lectura pública, escritura autenticada
alter table public.returns_daily enable row level security;

create policy if not exists "returns_daily_select"
  on public.returns_daily for select using (true);

create policy if not exists "returns_daily_insert"
  on public.returns_daily for insert with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

create policy if not exists "returns_daily_delete"
  on public.returns_daily for delete using (auth.role() = 'authenticated' or auth.role() = 'service_role');
