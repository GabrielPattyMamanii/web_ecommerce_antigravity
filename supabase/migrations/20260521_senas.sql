-- ============================================================
-- MIGRACIÓN: Sistema de Señas
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Agregar columnas de configuración de señas a site_config
ALTER TABLE site_config
  ADD COLUMN IF NOT EXISTS sena_enabled     boolean       DEFAULT true,
  ADD COLUMN IF NOT EXISTS sena_type        text          DEFAULT 'fixed',   -- 'fixed' | 'percentage'
  ADD COLUMN IF NOT EXISTS sena_amount      decimal(10,2) DEFAULT 0,         -- monto fijo en ARS
  ADD COLUMN IF NOT EXISTS sena_percentage  decimal(5,2)  DEFAULT 10;        -- % sobre el precio

-- 2. Crear tabla de señas
CREATE TABLE IF NOT EXISTS senas (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       text          NOT NULL,
  product_source   text          NOT NULL DEFAULT 'products', -- 'products' | 'catalog_products'
  product_name     text          NOT NULL,
  product_image    text,
  product_price    decimal(10,2),
  buyer_name       text          NOT NULL,
  buyer_email      text          NOT NULL,
  buyer_phone      text,
  amount_paid      decimal(10,2) NOT NULL,
  mp_preference_id text,
  mp_payment_id    text,
  status           text          NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  notes            text,
  created_at       timestamptz   NOT NULL DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE senas ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
-- El admin (autenticado) puede leer y gestionar todas las señas
CREATE POLICY "admin_read_senas"
  ON senas FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_update_senas"
  ON senas FOR UPDATE TO authenticated USING (true);

CREATE POLICY "admin_delete_senas"
  ON senas FOR DELETE TO authenticated USING (true);

-- El service_role (Edge Function) puede insertar señas
-- (las Edge Functions usan service_role, no necesitan policy de INSERT para anon)
CREATE POLICY "service_insert_senas"
  ON senas FOR INSERT TO service_role WITH CHECK (true);
