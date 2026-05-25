-- ============================================================
-- MIGRACIÓN v2: Campos adicionales en Señas
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de la v1
-- ============================================================

-- 1. Nuevos campos en la tabla senas
ALTER TABLE senas
  ADD COLUMN IF NOT EXISTS buyer_lastname     text,
  ADD COLUMN IF NOT EXISTS buyer_whatsapp     text,
  ADD COLUMN IF NOT EXISTS delivery_location  text;

-- 2. Lugares de entrega configurables por el admin (array de texto en site_config)
ALTER TABLE site_config
  ADD COLUMN IF NOT EXISTS sena_delivery_locations  text[] DEFAULT '{}';
