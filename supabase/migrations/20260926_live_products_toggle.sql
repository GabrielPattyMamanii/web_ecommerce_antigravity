-- Flag para activar/desactivar la sección pública "Productos en Live" desde Configuración
ALTER TABLE site_config
  ADD COLUMN IF NOT EXISTS live_products_enabled boolean DEFAULT true;
