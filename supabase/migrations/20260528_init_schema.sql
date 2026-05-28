-- Alpina BI Platform - PostgreSQL Initial Schema & RLS Migrations

-- 1. Create Core Master Tables
CREATE TABLE IF NOT EXISTS ciudades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text UNIQUE NOT NULL,
  categoria text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS vendedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text UNIQUE NOT NULL,
  zona text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Transactional Tables
CREATE TABLE IF NOT EXISTS ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  ciudad text NOT NULL,
  zona text NOT NULL,
  vendedor text NOT NULL,
  proveedor text NOT NULL,
  producto text,
  cantidad integer DEFAULT 1,
  valor numeric NOT NULL,
  tipo_pago text CHECK (tipo_pago IN ('CONTADO', 'CREDITO')),
  facturas integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS devoluciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date,
  concepto text NOT NULL,
  proveedor text NOT NULL,
  vendedor text NOT NULL,
  ciudad text NOT NULL,
  valor numeric NOT NULL,
  porcentaje numeric,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Optimization Indexes (as requested for high performance)
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_ciudad ON ventas(ciudad);
CREATE INDEX IF NOT EXISTS idx_ventas_zona ON ventas(zona);
CREATE INDEX IF NOT EXISTS idx_ventas_vendedor ON ventas(vendedor);
CREATE INDEX IF NOT EXISTS idx_ventas_proveedor ON ventas(proveedor);

CREATE INDEX IF NOT EXISTS idx_devoluciones_concepto ON devoluciones(concepto);
CREATE INDEX IF NOT EXISTS idx_devoluciones_vendedor ON devoluciones(vendedor);
CREATE INDEX IF NOT EXISTS idx_devoluciones_proveedor ON devoluciones(proveedor);

-- 4. Enable Row Level Security (RLS) on all tables
ALTER TABLE ciudades ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE devoluciones ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies and Helper Functions
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'user_role')::text,
    'vendedor'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Master read access for all logged users on master lists
CREATE POLICY "Allow authenticated read on master tables" ON ciudades
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on proveedores" ON proveedores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on vendedores" ON vendedores
  FOR SELECT TO authenticated USING (true);

-- Ventas Table Policies
CREATE POLICY "Admin full access on ventas" 
  ON ventas FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Supervisor read access on ventas" 
  ON ventas FOR SELECT TO authenticated
  USING (
    get_user_role() = 'supervisor' AND 
    ciudad = (auth.jwt() -> 'user_metadata' ->> 'assigned_city')::text
  );

CREATE POLICY "Seller read access on ventas" 
  ON ventas FOR SELECT TO authenticated
  USING (
    get_user_role() = 'vendedor' AND 
    vendedor = (auth.jwt() -> 'user_metadata' ->> 'seller_name')::text
  );

-- Devoluciones Table Policies
CREATE POLICY "Admin full access on devoluciones" 
  ON devoluciones FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Supervisor read access on devoluciones" 
  ON devoluciones FOR SELECT TO authenticated
  USING (
    get_user_role() = 'supervisor' AND 
    ciudad = (auth.jwt() -> 'user_metadata' ->> 'assigned_city')::text
  );

CREATE POLICY "Seller read access on devoluciones" 
  ON devoluciones FOR SELECT TO authenticated
  USING (
    get_user_role() = 'vendedor' AND 
    vendedor = (auth.jwt() -> 'user_metadata' ->> 'seller_name')::text
  );
