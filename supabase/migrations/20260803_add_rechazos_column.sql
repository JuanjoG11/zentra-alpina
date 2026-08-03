-- Add rechazos column to returns_sellers table
-- rechazos = devoluciones that are NOT M.E. (vencimiento)
-- cambios (M.E.) = devoluciones - rechazos
ALTER TABLE public.returns_sellers ADD COLUMN IF NOT EXISTS rechazos numeric DEFAULT 0;
