-- Add cambios column to returns_sellers table
-- cambios = devoluciones M.E. por vencimiento (DEV. M.E. POR VENCIMIENTO)
-- rechazos = todas las demás devoluciones (motivo distinto a vencimiento)
-- devoluciones = rechazos + cambios (total)
ALTER TABLE public.returns_sellers ADD COLUMN IF NOT EXISTS cambios numeric DEFAULT 0;
