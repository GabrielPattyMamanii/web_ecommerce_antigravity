-- ============================================================
-- MIGRACIÓN v3: Webhook de Mercado Pago
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de v1 y v2
-- ============================================================

-- 1. Política para que la Edge Function (service_role) pueda actualizar señas
--    (Supabase bypasses RLS con service_role, pero la dejamos explícita)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'senas'
          AND policyname = 'service_update_senas'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "service_update_senas"
              ON senas FOR UPDATE TO service_role USING (true)
        $policy$;
    END IF;
END$$;

-- 2. Índice en external_reference (mp_payment_id) para búsquedas rápidas del webhook
CREATE INDEX IF NOT EXISTS idx_senas_mp_payment_id ON senas (mp_payment_id);
