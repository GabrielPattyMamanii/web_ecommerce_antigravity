-- ============================================================
-- Sincroniza catalog_products.stock con entradas.cant_docenas_copy
-- ============================================================
-- Hasta ahora, el stock de catalog_products solo se copiaba una vez
-- desde cant_docenas_copy al publicar el producto (CatalogProductForm),
-- y nunca se volvía a actualizar: ni con ventas registradas por el
-- escáner (restar_cant_docenas_copy), ni con ediciones manuales de la
-- tanda. Esto dejaba el stock del catálogo público "congelado".
--
-- Nota: products (tabla independiente, sin relación con entradas) NO
-- se ve afectada por esta migración — mantiene su propio stock manual.

-- 1) Backfill: corrige el stock desactualizado de los productos ya publicados.
UPDATE catalog_products cp
SET stock = e.cant_docenas_copy
FROM entradas e
WHERE cp.id = e.id
  AND e.cant_docenas_copy IS NOT NULL
  AND cp.stock IS DISTINCT FROM e.cant_docenas_copy;

-- 2) Trigger: cada vez que cambia cant_docenas_copy en entradas
--    (venta por escáner, o edición manual en Agregar/Detalle de Tanda),
--    se refleja automáticamente en catalog_products.stock.
-- SECURITY DEFINER: la fila de entradas puede actualizarse desde un rol
-- (ej. la RPC del escáner) que no tenga permiso de UPDATE directo sobre
-- catalog_products bajo RLS; el trigger necesita poder escribir igual.
CREATE OR REPLACE FUNCTION public.sync_catalog_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE catalog_products
  SET stock = NEW.cant_docenas_copy
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_catalog_product_stock ON entradas;

CREATE TRIGGER trg_sync_catalog_product_stock
AFTER UPDATE OF cant_docenas_copy ON entradas
FOR EACH ROW
WHEN (OLD.cant_docenas_copy IS DISTINCT FROM NEW.cant_docenas_copy)
EXECUTE FUNCTION public.sync_catalog_product_stock();
