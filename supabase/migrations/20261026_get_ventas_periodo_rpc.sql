-- Detalle de lo vendido en un período corto (un día, una semana o un mes) para el desplegable del
-- dashboard "Resumen de ventas". Se consulta al abrir una fila, no al cargar el dashboard.
--
-- get_ventas_periodo(p_desde, p_hasta, p_dias)
--   - Ventas con fecha entre p_desde y p_hasta (ambas inclusive), máximo 35 días de rango.
--   - p_dias (opcional): días de la semana a incluir, 1 = lunes ... 7 = domingo; NULL = todos.
--     Es el mismo filtro de get_dashboard_ventas, para que el detalle sume igual que la fila.
--   - Mismos cálculos que get_dashboard_ventas: una línea "sin costo" no tiene costo, ganancia,
--     índice, markup ni margen, y queda fuera de esos totales.
--   - Devuelve hasta 1000 líneas (truncado = true si había más; los totales incluyen todas).
--
-- Dólares: cada línea trae también sus valores en USD, convertidos con el dolar_blue de ESA venta
--   (nunca con el dólar de Precio Venta Sugerido):
--     vendido_usd = total_ars / dolar_blue;  costo_usd = cantidad_docenas * costo_docena_usd;
--     ganancia_usd = vendido_usd - costo_usd. Sin dolar_blue válido, los valores en USD quedan NULL.
--   El índice, el markup y el margen son los mismos en pesos y en dólares (mismo dólar en ambos lados).
--
-- Devuelve: { ventas: [ {id, fecha, venta_id, pedido, producto, codigo, cantidad, precio_unitario,
--             costo_unitario, vendido, costo, ganancia, indice, markup, margen, dolar,
--             precio_unitario_usd, costo_unitario_usd, vendido_usd, costo_usd, ganancia_usd,
--             sin_costo, registrado_por} ],
--             total: {vendido, vendido_sin_costo, costo, ganancia, indice, markup, margen,
--             vendido_usd, costo_usd, ganancia_usd, ventas_sin_dolar,
--             cantidad_ventas, ventas_sin_costo}, truncado }
--
-- Seguridad: igual que get_dashboard_ventas, solo admin de Supabase Auth (error 42501 si no).

CREATE OR REPLACE FUNCTION public.get_ventas_periodo(
  p_desde date,
  p_hasta date,
  p_dias integer[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;
  IF p_desde IS NULL OR p_hasta IS NULL OR p_hasta < p_desde THEN
    RAISE EXCEPTION 'Período inválido' USING ERRCODE = '22023';
  END IF;
  IF p_hasta - p_desde > 35 THEN
    RAISE EXCEPTION 'Período demasiado largo para el detalle (máximo 35 días)' USING ERRCODE = '22023';
  END IF;
  IF p_dias IS NOT NULL AND (cardinality(p_dias) = 0 OR EXISTS (SELECT 1 FROM unnest(p_dias) d WHERE d IS NULL OR d NOT BETWEEN 1 AND 7)) THEN
    RAISE EXCEPTION 'Días inválidos (1 = lunes ... 7 = domingo)' USING ERRCODE = '22023';
  END IF;

  WITH base AS (
    SELECT v.id, v.fecha, v.venta_id, v.nombre_pedido, v.producto_titulo, v.codigo, v.cantidad_docenas,
           v.total_ars, v.dolar_blue, v.costo_docena_usd, v.registrado_por,
           (v.costo_docena_usd IS NOT NULL AND COALESCE(v.dolar_blue, 0) > 0) AS con_costo
      FROM public.ventas v
     WHERE v.fecha BETWEEN p_desde AND p_hasta
       AND (p_dias IS NULL OR extract(isodow FROM v.fecha)::int = ANY(p_dias))
  ),
  calc AS (
    SELECT b.*,
           CASE WHEN b.con_costo
                THEN b.cantidad_docenas * b.costo_docena_usd * b.dolar_blue END AS costo_ars,
           CASE WHEN COALESCE(b.dolar_blue, 0) > 0 THEN b.total_ars / b.dolar_blue END AS vendido_usd,
           CASE WHEN b.con_costo THEN b.cantidad_docenas * b.costo_docena_usd END AS costo_usd
      FROM base b
  ),
  total AS (
    SELECT COALESCE(SUM(c.total_ars), 0)                                  AS vendido,
           COALESCE(SUM(c.total_ars) FILTER (WHERE c.con_costo), 0)       AS vendido_con_costo,
           COALESCE(SUM(c.total_ars) FILTER (WHERE NOT c.con_costo), 0)   AS vendido_sin_costo,
           COALESCE(SUM(c.costo_ars), 0)                                  AS costo,
           SUM(c.vendido_usd)                                             AS vendido_usd,
           SUM(c.vendido_usd) FILTER (WHERE c.con_costo)                  AS vendido_con_costo_usd,
           SUM(c.costo_usd)                                               AS costo_usd,
           COUNT(*) FILTER (WHERE c.vendido_usd IS NULL)                  AS lineas_sin_dolar,
           COUNT(DISTINCT c.venta_id)                                     AS cantidad_ventas,
           COUNT(*)                                                       AS lineas,
           COUNT(*) FILTER (WHERE NOT c.con_costo)                        AS lineas_sin_costo
      FROM calc c
  ),
  detalle AS (
    SELECT c.* FROM calc c ORDER BY c.fecha DESC, c.venta_id, c.id LIMIT 1000
  )
  SELECT jsonb_build_object(
    'ventas', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',              d.id,
        'fecha',           to_char(d.fecha, 'YYYY-MM-DD'),
        'venta_id',        d.venta_id,
        'pedido',          d.nombre_pedido,
        'producto',        d.producto_titulo,
        'codigo',          d.codigo,
        'cantidad',        d.cantidad_docenas,
        'precio_unitario', CASE WHEN d.cantidad_docenas > 0 THEN round(d.total_ars / d.cantidad_docenas) END,
        'costo_unitario',  CASE WHEN d.con_costo THEN round(d.costo_docena_usd * d.dolar_blue) END,
        'vendido',         round(d.total_ars),
        'costo',           CASE WHEN d.con_costo THEN round(d.costo_ars) END,
        'ganancia',        CASE WHEN d.con_costo THEN round(d.total_ars - d.costo_ars) END,
        'indice',          CASE WHEN d.con_costo AND d.costo_ars > 0 THEN round(d.total_ars / d.costo_ars, 3) END,
        'markup',          CASE WHEN d.con_costo AND d.costo_ars > 0 THEN round((d.total_ars - d.costo_ars) / d.costo_ars * 100, 1) END,
        'margen',          CASE WHEN d.con_costo AND d.total_ars > 0 THEN round((d.total_ars - d.costo_ars) / d.total_ars * 100, 1) END,
        'dolar',               CASE WHEN COALESCE(d.dolar_blue, 0) > 0 THEN d.dolar_blue END,
        'precio_unitario_usd', CASE WHEN d.vendido_usd IS NOT NULL AND d.cantidad_docenas > 0 THEN round(d.vendido_usd / d.cantidad_docenas, 2) END,
        'costo_unitario_usd',  CASE WHEN d.con_costo THEN round(d.costo_docena_usd, 2) END,
        'vendido_usd',         round(d.vendido_usd, 2),
        'costo_usd',           round(d.costo_usd, 2),
        'ganancia_usd',        CASE WHEN d.con_costo THEN round(d.vendido_usd - d.costo_usd, 2) END,
        'sin_costo',       NOT d.con_costo,
        'registrado_por',  d.registrado_por
      ) ORDER BY d.fecha DESC, d.venta_id, d.id), '[]'::jsonb) FROM detalle d
    ),
    'total', (
      SELECT jsonb_build_object(
        'vendido',           round(t.vendido),
        'vendido_sin_costo', round(t.vendido_sin_costo),
        'costo',             round(t.costo),
        'ganancia',          round(t.vendido_con_costo - t.costo),
        'indice',            CASE WHEN t.costo > 0 THEN round(t.vendido_con_costo / t.costo, 3) END,
        'markup',            CASE WHEN t.costo > 0 THEN round((t.vendido_con_costo - t.costo) / t.costo * 100, 1) END,
        'margen',            CASE WHEN t.vendido_con_costo > 0 THEN round((t.vendido_con_costo - t.costo) / t.vendido_con_costo * 100, 1) END,
        'vendido_usd',       round(COALESCE(t.vendido_usd, 0), 2),
        'costo_usd',         round(COALESCE(t.costo_usd, 0), 2),
        'ganancia_usd',      round(COALESCE(t.vendido_con_costo_usd, 0) - COALESCE(t.costo_usd, 0), 2),
        'ventas_sin_dolar',  t.lineas_sin_dolar,
        'cantidad_ventas',   t.cantidad_ventas,
        'ventas_sin_costo',  t.lineas_sin_costo
      ) FROM total t
    ),
    'truncado', (SELECT t.lineas > 1000 FROM total t)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ventas_periodo(date, date, integer[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ventas_periodo(date, date, integer[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
