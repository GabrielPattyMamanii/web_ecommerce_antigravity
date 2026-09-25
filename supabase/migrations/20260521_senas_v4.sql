-- ============================================================
-- MIGRACIÓN v4: Estado "Entregado" para señas
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de v1, v2 y v3
-- ============================================================

-- 1. Ampliar el CHECK de status para incluir 'delivered'
ALTER TABLE senas DROP CONSTRAINT IF EXISTS senas_status_check;

ALTER TABLE senas
  ADD CONSTRAINT senas_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'delivered'));
