-- Agregar columna 'cambios' a returns_sellers si no existe
-- Ejecutar en Supabase SQL Editor

ALTER TABLE returns_sellers
  ADD COLUMN IF NOT EXISTS cambios bigint NOT NULL DEFAULT 0;

-- Verificar resultado
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'returns_sellers'
ORDER BY ordinal_position;
