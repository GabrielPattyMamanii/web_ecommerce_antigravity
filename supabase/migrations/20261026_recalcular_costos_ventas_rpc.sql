-- Botón "Recalcular costos" del dashboard de ventas (2ª etapa).
-- Completa ventas.costo_docena_usd en las ventas que tienen entrada_id y costo NULL, usando
-- public.calc_costo_docena_usd (migración 20261024_backfill_costo_docena_usd.sql: ejecutarla ANTES).
--
-- Reglas:
--   - Solo toca ventas con costo_docena_usd IS NULL y entrada_id NOT NULL. Nunca sobrescribe un costo.
--   - Si el cálculo devuelve NULL (faltan datos), esa venta queda como está.
--   - p_aplicar = false (por defecto): VISTA PREVIA, no escribe nada.
--     p_aplicar = true: guarda los costos calculados.
--   - Solo admin de Supabase Auth (auth.uid() + is_admin()), como get_dashboard_ventas.
--   - El UPDATE no cambia cantidad_docenas ni entrada_id, así que los triggers de stock no actúan.
--   - Los datos de la tanda se leen HOY (precio, gastos, bultos): sirve porque casi nunca cambian,
--     salvo correcciones.
--
-- Devuelve: { aplicado, recalculables, sin_resultado, actualizadas, muestra: [ {id, fecha, producto,
--             codigo, cantidad, costo_docena_usd, tanda, marca, boleta} ] (hasta 20 más recientes) }

CREATE OR REPLACE FUNCTION public.recalcular_costos_ventas(p_aplicar boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recalculables integer;
  v_sin_resultado integer;
  v_actualizadas integer := 0;
  v_muestra jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  CREATE TEMP TABLE _calc_costos ON COMMIT DROP AS
    SELECT v.id, v.fecha, v.producto_titulo, v.codigo, v.cantidad_docenas,
           e.tanda_nombre, e.marca, e.codigo_boleta,
           public.calc_costo_docena_usd(v.entrada_id) AS costo
      FROM public.ventas v
      LEFT JOIN public.entradas e ON e.id = v.entrada_id
     WHERE v.costo_docena_usd IS NULL
       AND v.entrada_id IS NOT NULL;

  SELECT count(*) FILTER (WHERE costo IS NOT NULL),
         count(*) FILTER (WHERE costo IS NULL)
    INTO v_recalculables, v_sin_resultado
    FROM _calc_costos;

  IF p_aplicar THEN
    UPDATE public.ventas v
       SET costo_docena_usd = c.costo
      FROM _calc_costos c
     WHERE v.id = c.id
       AND c.costo IS NOT NULL
       AND v.costo_docena_usd IS NULL;
    GET DIAGNOSTICS v_actualizadas = ROW_COUNT;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', m.id, 'fecha', to_char(m.fecha, 'YYYY-MM-DD'), 'producto', m.producto_titulo,
           'codigo', m.codigo, 'cantidad', m.cantidad_docenas, 'costo_docena_usd', m.costo,
           'tanda', m.tanda_nombre, 'marca', m.marca, 'boleta', m.codigo_boleta
         ) ORDER BY m.fecha DESC, m.id DESC), '[]'::jsonb)
    INTO v_muestra
    FROM (SELECT * FROM _calc_costos WHERE costo IS NOT NULL ORDER BY fecha DESC, id DESC LIMIT 20) m;

  RETURN jsonb_build_object(
    'aplicado', p_aplicar,
    'recalculables', v_recalculables,
    'sin_resultado', v_sin_resultado,
    'actualizadas', v_actualizadas,
    'muestra', v_muestra
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recalcular_costos_ventas(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalcular_costos_ventas(boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
