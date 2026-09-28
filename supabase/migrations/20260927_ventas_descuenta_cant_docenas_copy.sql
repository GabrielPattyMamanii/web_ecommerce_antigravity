-- ============================================================
-- Hace que "Registrar Venta" (VentasScanner.jsx) descuente stock real
-- ============================================================
-- Hasta ahora, confirmar una venta desde VentasScanner.jsx solo insertaba
-- filas en "ventas" — nunca tocaba entradas.cant_docenas_copy. El
-- "disponible" que se mostraba en pantalla era un cálculo en vivo
-- (cantidad_docenas - SUM(ventas...) filtrado por codigo+propietario+tanda),
-- que además solo funcionaba si la entrada tenía un dueño asignado.
--
-- Esta migración:
--   1) Agrega ventas.entrada_id: referencia directa y sin ambigüedad a la
--      entrada vendida (reemplaza el match frágil por texto codigo+propietario).
--   2) Trigger de INSERT: al cargar una venta nueva, resta la cantidad de
--      entradas.cant_docenas_copy.
--   3) Trigger de UPDATE: si se edita la cantidad de una venta ya cargada
--      (VentasHistorial.jsx), ajusta la diferencia.
--   4) Trigger de DELETE: si se borra una venta, le devuelve la cantidad
--      a cant_docenas_copy.
--
-- IMPORTANTE — no toca datos existentes:
--   - entrada_id es nullable: las ventas ya cargadas quedan con NULL y
--     los triggers las ignoran (IF entrada_id IS NOT NULL). No se intenta
--     adivinar a qué entrada correspondían ventas históricas.
--   - Ningún trigger modifica columnas de "ventas" (precio, cantidad,
--     fecha, etc.) — solo leen esas columnas para ajustar "entradas".
--   - ON DELETE SET NULL: si una entrada se borra al re-guardar una tanda
--     (ver AgregarTanda.jsx, IDs pueden cambiar), las ventas que la
--     referenciaban NO se borran ni se bloquean — solo pierden el vínculo.
--
-- Como cant_docenas_copy ya dispara el trigger de la migración anterior
-- (20260927_sync_catalog_product_stock.sql), esto también actualiza
-- catalog_products.stock automáticamente en cadena.

ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS entrada_id uuid REFERENCES entradas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ventas_entrada_id ON ventas (entrada_id);

-- 1) INSERT: descuenta al confirmar una venta nueva
CREATE OR REPLACE FUNCTION public.descontar_stock_por_venta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.entrada_id IS NOT NULL THEN
    UPDATE entradas
    SET cant_docenas_copy = COALESCE(cant_docenas_copy, 0) - NEW.cantidad_docenas
    WHERE id = NEW.entrada_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ventas_descuenta_stock ON ventas;

CREATE TRIGGER trg_ventas_descuenta_stock
AFTER INSERT ON ventas
FOR EACH ROW
EXECUTE FUNCTION public.descontar_stock_por_venta();

-- 2) UPDATE: reajusta si cambia la cantidad (o el vínculo) de una venta ya cargada
CREATE OR REPLACE FUNCTION public.reajustar_stock_por_edicion_venta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.entrada_id IS NOT DISTINCT FROM OLD.entrada_id THEN
    IF NEW.entrada_id IS NOT NULL AND NEW.cantidad_docenas IS DISTINCT FROM OLD.cantidad_docenas THEN
      UPDATE entradas
      SET cant_docenas_copy = COALESCE(cant_docenas_copy, 0) + OLD.cantidad_docenas - NEW.cantidad_docenas
      WHERE id = NEW.entrada_id;
    END IF;
  ELSE
    IF OLD.entrada_id IS NOT NULL THEN
      UPDATE entradas
      SET cant_docenas_copy = COALESCE(cant_docenas_copy, 0) + OLD.cantidad_docenas
      WHERE id = OLD.entrada_id;
    END IF;
    IF NEW.entrada_id IS NOT NULL THEN
      UPDATE entradas
      SET cant_docenas_copy = COALESCE(cant_docenas_copy, 0) - NEW.cantidad_docenas
      WHERE id = NEW.entrada_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ventas_reajusta_stock ON ventas;

CREATE TRIGGER trg_ventas_reajusta_stock
AFTER UPDATE ON ventas
FOR EACH ROW
EXECUTE FUNCTION public.reajustar_stock_por_edicion_venta();

-- 3) DELETE: devuelve la cantidad si se borra una venta
CREATE OR REPLACE FUNCTION public.devolver_stock_por_venta_borrada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.entrada_id IS NOT NULL THEN
    UPDATE entradas
    SET cant_docenas_copy = COALESCE(cant_docenas_copy, 0) + OLD.cantidad_docenas
    WHERE id = OLD.entrada_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_ventas_devuelve_stock ON ventas;

CREATE TRIGGER trg_ventas_devuelve_stock
AFTER DELETE ON ventas
FOR EACH ROW
EXECUTE FUNCTION public.devolver_stock_por_venta_borrada();
