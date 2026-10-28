-- Completa ventas.costo_docena_usd en las ventas ya cargadas que tienen entrada_id.
--
-- ANTES DE EJECUTAR:
--   1) Haber ejecutado 20261023_ventas_costo_docena_usd.sql (crea la columna).
--   2) Hacer un backup (backup-db.ps1).
--
-- IMPORTANTE:
--   - El costo se calcula con los datos de HOY de "entradas" y "tandas", no con los del momento de
--     la venta: para ventas ya cargadas no hay forma de reconstruir el valor original. Los gastos y
--     los bultos solo cambian por correcciones, así que el resultado es confiable.
--   - Solo completa ventas con costo_docena_usd NULL y entrada_id NO nulo. Nunca pisa un costo ya
--     guardado. Las ventas sin entrada_id (no se sabe a qué producto pertenecen) quedan en NULL.
--   - Si no se puede calcular con certeza (ver reglas abajo), la venta queda en NULL.
--   - El UPDATE solo cambia la columna costo_docena_usd. El trigger trg_ventas_reajusta_stock
--     únicamente actúa si cambia cantidad_docenas o entrada_id, así que no mueve el stock.
--
-- Esta función replica EXACTAMENTE la lógica de src/utils/costoDocena.js (la que usa "Registrar
-- Venta"). Si se cambia una, hay que cambiar la otra.
--
-- Reglas del costo de UNA docena (USD):
--   - Bultos personalizados de la marca (tandas.parametros -> marcasMetadata -> marca_id o marca)
--     se usan (prorrateo) SOLO si son distintos de cero Y la suma de los bultos de las filas de la
--     boleta (grupo tanda + marca + boleta) es cero:
--       costo = precio_docena × (1 + gastos × bultos_personalizados / valor_total_de_la_boleta)
--   - Si no, el envío se reparte por los bultos de cada fila:
--       costo = (precio_docena × docenas + gastos × bultos de la fila) / docenas
--   - NULL si faltan datos de compra, o si hay gastos pero ningún bulto aplicable (saldría sin envío).

-- calc_costo_docena_usd_detalle devuelve el costo Y, cuando no se puede calcular (costo NULL), el motivo en
-- `codigo` (los mismos códigos que src/utils/costoDocena.js):
--   'entrada_inexistente' | 'faltan_datos' | 'sin_valor_compra' | 'sin_bultos'
-- calc_costo_docena_usd (más abajo) devuelve solo el costo. Hay UNA sola implementación del cálculo en SQL.
CREATE OR REPLACE FUNCTION public.calc_costo_docena_usd_detalle(p_entrada_id uuid, OUT costo numeric, OUT codigo text)
RETURNS record
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  e record;
  v_pers numeric;
  v_suma_bultos numeric;
  v_valor_total numeric;
  v_gastos numeric;
  v_costo numeric;
BEGIN
  SELECT id, tanda_nombre, marca, marca_id, codigo_boleta, cantidad_docenas, precio_docena, gastos, bultos
    INTO e
    FROM public.entradas
   WHERE id = p_entrada_id;

  IF NOT FOUND THEN codigo := 'entrada_inexistente'; RETURN; END IF;
  IF e.precio_docena IS NULL OR COALESCE(e.cantidad_docenas, 0) <= 0 THEN codigo := 'faltan_datos'; RETURN; END IF;

  v_gastos := COALESCE(e.gastos, 0);

  -- Filas de la misma boleta (tanda + marca + boleta; boleta vacía y NULL cuentan igual)
  SELECT COALESCE(SUM(COALESCE(x.bultos, 0)), 0),
         COALESCE(SUM(COALESCE(x.cantidad_docenas, 0) * COALESCE(x.precio_docena, 0)), 0)
    INTO v_suma_bultos, v_valor_total
    FROM public.entradas x
   WHERE x.tanda_nombre IS NOT DISTINCT FROM e.tanda_nombre
     AND x.marca IS NOT DISTINCT FROM e.marca
     AND COALESCE(x.codigo_boleta, '') = COALESCE(e.codigo_boleta, '');

  -- Bultos personalizados de la marca (por marca_id si existe, si no por nombre). Valor no numérico = 0
  SELECT CASE
           WHEN (m.value->>'bultos_personalizados') ~ '^[0-9]+(\.[0-9]+)?$'
             THEN (m.value->>'bultos_personalizados')::numeric
           ELSE 0
         END
    INTO v_pers
    FROM public.tandas t,
         LATERAL jsonb_each(COALESCE(t.parametros->'marcasMetadata', '{}'::jsonb)) AS m
   WHERE t.nombre = e.tanda_nombre
     AND m.key = COALESCE(NULLIF(e.marca_id, ''), e.marca)
   LIMIT 1;
  v_pers := COALESCE(v_pers, 0);

  IF v_pers > 0 AND v_suma_bultos = 0 THEN
    IF v_valor_total <= 0 THEN codigo := 'sin_valor_compra'; RETURN; END IF;
    v_costo := e.precio_docena * (1 + (v_gastos * v_pers) / v_valor_total);
  ELSE
    IF v_gastos > 0 AND v_suma_bultos = 0 THEN codigo := 'sin_bultos'; RETURN; END IF;
    v_costo := (e.precio_docena * e.cantidad_docenas + v_gastos * COALESCE(e.bultos, 0)) / e.cantidad_docenas;
  END IF;

  costo := round(v_costo, 6);
END;
$$;

CREATE OR REPLACE FUNCTION public.calc_costo_docena_usd(p_entrada_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (public.calc_costo_docena_usd_detalle(p_entrada_id)).costo;
$$;

-- Solo se usan desde el SQL Editor y desde las RPC SECURITY DEFINER del dashboard: no se exponen a la app.
REVOKE ALL ON FUNCTION public.calc_costo_docena_usd_detalle(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calc_costo_docena_usd(uuid) FROM PUBLIC;

-- ------------------------------------------------------------
-- PASO 1 — VISTA PREVIA (solo lectura). Ejecutá esto primero y revisá el resultado.
-- ------------------------------------------------------------
-- Resumen: cuántas ventas se completarían y cuántas quedan sin costo
--
--   SELECT
--     count(*)                                                    AS ventas_sin_costo_con_vinculo,
--     count(*) FILTER (WHERE public.calc_costo_docena_usd(entrada_id) IS NOT NULL) AS se_completarian,
--     count(*) FILTER (WHERE public.calc_costo_docena_usd(entrada_id) IS NULL)     AS quedarian_sin_costo
--   FROM public.ventas
--   WHERE costo_docena_usd IS NULL AND entrada_id IS NOT NULL;
--
-- Detalle (las 50 más recientes):
--
--   SELECT v.id, v.fecha, v.codigo, v.cantidad_docenas, v.dolar_blue,
--          public.calc_costo_docena_usd(v.entrada_id) AS costo_docena_usd_nuevo
--   FROM public.ventas v
--   WHERE v.costo_docena_usd IS NULL AND v.entrada_id IS NOT NULL
--   ORDER BY v.fecha DESC, v.id DESC
--   LIMIT 50;
--
-- ------------------------------------------------------------
-- PASO 2 — COMPLETAR (escribe en la base). Ejecutalo recién después de revisar la vista previa
-- y de hacer el backup. Se puede repetir sin efectos: solo toca ventas que sigan en NULL.
-- ------------------------------------------------------------
--
--   UPDATE public.ventas v
--      SET costo_docena_usd = public.calc_costo_docena_usd(v.entrada_id)
--    WHERE v.costo_docena_usd IS NULL
--      AND v.entrada_id IS NOT NULL
--      AND public.calc_costo_docena_usd(v.entrada_id) IS NOT NULL;
--
-- Verificación posterior (cuántas siguen sin costo):
--
--   SELECT count(*) FILTER (WHERE entrada_id IS NOT NULL) AS sin_costo_con_vinculo,
--          count(*) FILTER (WHERE entrada_id IS NULL)     AS sin_costo_sin_vinculo
--   FROM public.ventas WHERE costo_docena_usd IS NULL;
