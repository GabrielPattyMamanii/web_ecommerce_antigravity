-- supabase/migrations/20260926_sena_carritos.sql
-- Migra el sistema de señas de "1 seña = 1 producto" a un carrito de señas
-- con múltiples productos/cantidades por pago, y agrega el modo de precio
-- por rangos de cantidad (configurable desde /admin/senas).

-- ── Rangos de precio configurables ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS sena_price_ranges (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  min_qty    integer       NOT NULL CHECK (min_qty >= 1),
  max_qty    integer       CHECK (max_qty IS NULL OR max_qty >= min_qty),
  amount     decimal(10,2) NOT NULL CHECK (amount >= 0),
  sort_order integer       NOT NULL DEFAULT 0,
  created_at timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE sena_price_ranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_sena_price_ranges"
  ON sena_price_ranges FOR SELECT
  USING (true);

CREATE POLICY "admin_write_sena_price_ranges"
  ON sena_price_ranges FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Cabecera del carrito de señas (1 pago = 1 carrito) ──────────────────
CREATE TABLE IF NOT EXISTS sena_carritos (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_name         text          NOT NULL,
  buyer_lastname     text,
  buyer_email        text          NOT NULL,
  buyer_whatsapp     text,
  delivery_location  text,
  amount_paid        decimal(10,2) NOT NULL,
  mp_preference_id   text,
  mp_payment_id      text,
  status             text          NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'delivered')),
  notes              text,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE sena_carritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_sena_carritos"
  ON sena_carritos FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admin_update_sena_carritos"
  ON sena_carritos FOR UPDATE TO authenticated
  USING (public.is_admin());

CREATE POLICY "admin_delete_sena_carritos"
  ON sena_carritos FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "service_insert_sena_carritos"
  ON sena_carritos FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "service_update_sena_carritos"
  ON sena_carritos FOR UPDATE TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS idx_sena_carritos_mp_payment_id ON sena_carritos (mp_payment_id);

-- ── Ítems del carrito (1 fila por producto+cantidad dentro del carrito) ─
CREATE TABLE IF NOT EXISTS sena_items (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  sena_carrito_id  uuid          NOT NULL REFERENCES sena_carritos(id) ON DELETE CASCADE,
  product_id       text          NOT NULL,
  product_source   text          NOT NULL DEFAULT 'products',
  product_name     text          NOT NULL,
  product_image    text,
  product_price    decimal(10,2),
  quantity         integer       NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  created_at       timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE sena_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_sena_items"
  ON sena_items FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admin_delete_sena_items"
  ON sena_items FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "service_insert_sena_items"
  ON sena_items FOR INSERT TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sena_items_carrito_id ON sena_items (sena_carrito_id);

-- ── Migración de datos: cada fila de "senas" pasa a ser un carrito de 1 ítem ─
INSERT INTO sena_carritos (
  id, buyer_name, buyer_lastname, buyer_email, buyer_whatsapp,
  delivery_location, amount_paid, mp_preference_id, mp_payment_id,
  status, notes, created_at
)
SELECT
  id, buyer_name, buyer_lastname, buyer_email, buyer_whatsapp,
  delivery_location, amount_paid, mp_preference_id, mp_payment_id,
  status, notes, created_at
FROM senas
ON CONFLICT (id) DO NOTHING;

INSERT INTO sena_items (
  sena_carrito_id, product_id, product_source, product_name,
  product_image, product_price, quantity, created_at
)
SELECT
  id, product_id, product_source, product_name,
  product_image, product_price, 1, created_at
FROM senas;

-- ── Se reemplaza por completo el modelo anterior ────────────────────────
DROP TABLE IF EXISTS senas;

-- ── Config: el tipo de seña admite ahora también "ranges" ──────────────
COMMENT ON COLUMN site_config.sena_type IS
  'Modo de cálculo de la seña: fixed | percentage | ranges (rangos por cantidad total, ver sena_price_ranges)';
