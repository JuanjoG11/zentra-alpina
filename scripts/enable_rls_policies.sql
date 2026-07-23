-- =============================================================
-- HABILITAR ACCESO PÚBLICO A LAS TABLAS NUEVAS
-- (igual que las tablas existentes del proyecto)
-- Ejecutar en Supabase → SQL Editor
-- =============================================================

-- Deshabilitar RLS en las tablas nuevas para acceso con anon key
ALTER TABLE public.returns_concepts      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_returns        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expiry_concepts       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expiry_client_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_distrib       DISABLE ROW LEVEL SECURITY;

-- Dar permisos completos al rol anon y authenticated
GRANT ALL ON public.returns_concepts      TO anon, authenticated;
GRANT ALL ON public.client_returns        TO anon, authenticated;
GRANT ALL ON public.expiry_concepts       TO anon, authenticated;
GRANT ALL ON public.expiry_client_returns TO anon, authenticated;
GRANT ALL ON public.product_distrib       TO anon, authenticated;

-- Dar permisos en las secuencias de IDs
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
