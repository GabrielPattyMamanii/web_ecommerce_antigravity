-- Agrega columna "code" a catalog_products para persistir el código de mercancía
-- (hoy solo se leía vía join con entradas.codigo, nunca se guardaba en la tabla).
-- También se agrega a products con IF NOT EXISTS por consistencia/seguridad,
-- aunque ya existe en la base real (sentencia inocua en ese caso).
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS code text;

ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS code text;
