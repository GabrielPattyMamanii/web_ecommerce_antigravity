-- Guarda en cada venta el costo de la docena (en dólares) al momento de vender.
--
-- Para qué: el dashboard de ventas y ganancia necesita el costo "del momento". Hoy el costo solo
-- vive en "entradas" (precio_docena, gastos, bultos, bultos personalizados) y cambia si se edita la
-- tanda; además, al re-guardar una tanda las entradas se recrean y las ventas pierden el vínculo
-- (entrada_id queda NULL). Con esta columna la ganancia histórica queda congelada.
--
--   costo_docena_usd = costo de UNA docena en USD, calculado con la misma fórmula que
--                      "Precio Venta Sugerido" (prorrateo por valor en boletas con bultos
--                      personalizados; bultos de cada fila en boletas normales).
--
-- Se guarda en USD (no en pesos) a propósito: el costo en USD no depende del dólar. La conversión
-- a pesos se hace al calcular, con el dólar de cada venta (ventas.dolar_blue), NO con el dólar de
-- "Precio Venta Sugerido":
--
--   Costo (ARS)    = cantidad_docenas × costo_docena_usd × dolar_blue
--   Ganancia (ARS) = total_ars - Costo (ARS)
--
-- IMPORTANTE — no toca datos existentes:
--   - La columna es nullable y sin default: las ventas ya cargadas quedan en NULL, que significa
--     "sin costo guardado". El dashboard las cuenta aparte; NO se les inventa un costo.
--   - Los INSERT actuales (VentasScanner.jsx) siguen funcionando sin cambios: no envían la columna.
--   - Los triggers de stock (trg_ventas_*) no leen esta columna, así que no se ven afectados.
--   - No hay UPDATE, backfill ni cambios de políticas RLS.
--
-- El valor lo calcula y envía el front al insertar (VentasScanner.jsx); no se calcula en SQL porque
-- el prorrateo necesita todos los productos de la boleta y los bultos personalizados de la tanda.
--
-- Para quitarla:  ALTER TABLE public.ventas DROP COLUMN costo_docena_usd;

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS costo_docena_usd numeric;

-- Un costo negativo no tiene sentido; NULL (sin costo guardado) sigue permitido.
-- NOT VALID: no revisa las filas existentes (todas son NULL igual), solo valida las nuevas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ventas_costo_docena_usd_no_negativo'
      AND conrelid = 'public.ventas'::regclass
  ) THEN
    ALTER TABLE public.ventas
      ADD CONSTRAINT ventas_costo_docena_usd_no_negativo
      CHECK (costo_docena_usd IS NULL OR costo_docena_usd >= 0) NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN public.ventas.costo_docena_usd IS
  'Costo de una docena en USD al momento de la venta (se convierte a pesos con ventas.dolar_blue). NULL = venta sin costo guardado.';

-- Verificación (solo lectura):
--   SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'ventas' AND column_name = 'costo_docena_usd';
