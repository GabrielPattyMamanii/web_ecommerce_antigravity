-- Flag global para habilitar/deshabilitar el botón "Agregar a Live" en Productos,
-- sin importar el rol o permisos del usuario que esté logueado.
ALTER TABLE site_config
  ADD COLUMN IF NOT EXISTS live_button_enabled boolean DEFAULT true;
