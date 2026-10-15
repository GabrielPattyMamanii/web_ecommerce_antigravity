-- ============================================================
-- Sincroniza el código de las ventas cuando cambia el código de un producto
-- ============================================================
-- Problema: cada venta guarda una COPIA del código del producto (ventas.codigo). Si después se
-- cambia el código del producto en la edición de tanda (ej. GT8008 -> GT80088), la fila del
-- producto conserva su id y las ventas siguen vinculadas por entrada_id (el stock no se rompe),
-- pero las ventas viejas siguen diciendo "GT8008". Pantallas que agrupan por código (por ejemplo
-- Entrega de dinero) muestran el mismo producto en dos líneas.
--
-- Solución: un trigger en "entradas" que, cada vez que cambia el código de un producto,
-- actualiza el código de TODAS las ventas de ese producto (las que tienen su entrada_id).
--
--   - Se crea UNA sola vez (ejecutando este archivo). Después se dispara solo.
--   - Se dispara únicamente cuando cambia "codigo" (guardar una tanda sin cambiar códigos no hace nada).
--   - Funciona desde cualquier lado: AgregarTanda, el editor SQL, etc., y es atómico con el cambio.
--   - No toca el stock: el trigger trg_ventas_reajusta_stock solo actúa si cambia la cantidad o el
--     entrada_id de la venta, no el código.
--   - No alcanza a las ventas sin entrada_id (las viejas sin vincular): no hay forma segura de
--     saber a qué producto pertenecen.
--   - Solo sincroniza el código; título, marca y tanda de las ventas no se modifican.
--
-- Para quitarlo:  DROP TRIGGER trg_entradas_sync_codigo_ventas ON public.entradas;
--                 DROP FUNCTION public.sync_codigo_ventas();

CREATE OR REPLACE FUNCTION public.sync_codigo_ventas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ventas.codigo no admite vacío: si el producto queda sin código, no se toca nada
  IF NEW.codigo IS NOT NULL AND NEW.codigo IS DISTINCT FROM OLD.codigo THEN
    UPDATE public.ventas
       SET codigo = NEW.codigo
     WHERE entrada_id = NEW.id
       AND codigo IS DISTINCT FROM NEW.codigo;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_entradas_sync_codigo_ventas ON public.entradas;

CREATE TRIGGER trg_entradas_sync_codigo_ventas
AFTER UPDATE OF codigo ON public.entradas
FOR EACH ROW
WHEN (OLD.codigo IS DISTINCT FROM NEW.codigo)
EXECUTE FUNCTION public.sync_codigo_ventas();

-- ------------------------------------------------------------
-- Corrección única de las ventas que HOY ya tienen un código distinto al de su producto
-- (códigos que se cambiaron antes de crear el trigger).
-- Vista previa (solo lectura), si querés revisar antes de ejecutar el UPDATE de abajo:
--
--   SELECT v.id, v.codigo AS codigo_en_venta, e.codigo AS codigo_del_producto, e.tanda_nombre
--   FROM public.ventas v JOIN public.entradas e ON e.id = v.entrada_id
--   WHERE v.codigo IS DISTINCT FROM e.codigo AND e.codigo IS NOT NULL;
-- ------------------------------------------------------------
UPDATE public.ventas v
   SET codigo = e.codigo
  FROM public.entradas e
 WHERE v.entrada_id = e.id
   AND e.codigo IS NOT NULL
   AND v.codigo IS DISTINCT FROM e.codigo;

-- Verificación (debe devolver 0 filas):
--   SELECT v.id FROM public.ventas v JOIN public.entradas e ON e.id = v.entrada_id
--   WHERE v.codigo IS DISTINCT FROM e.codigo;
