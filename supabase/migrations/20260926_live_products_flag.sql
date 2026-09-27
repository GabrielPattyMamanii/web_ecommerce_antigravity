-- Marca por producto si aparece en la sección pública "Productos en Live"
-- Mismo patrón que la columna "published": un boolean por tabla de origen.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_live boolean DEFAULT false;

ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS is_live boolean DEFAULT false;
