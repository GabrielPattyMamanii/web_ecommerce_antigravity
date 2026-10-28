-- RPC del dashboard de ventas y ganancia (solo lectura, SOLO ADMIN).
--
-- Requiere haber ejecutado antes 20261023_ventas_costo_docena_usd.sql (columna costo_docena_usd).
--
-- Devuelve un único JSON con el período pedido, agrupado por día, semana o mes:
--   periodo, grafico {labels, vendido, ganancia, vendido_usd, ganancia_usd}, por_dia [...],
--   total {...}, alertas {...}, advertencias [...]
--
-- Reglas:
--   - Solo ventas con fecha entre p_desde y p_hasta (ambas inclusive). Se agrupa por ventas.fecha
--     (ya es la fecha local de Argentina), no por created_at (UTC).
--   - Toda fila de ventas es una venta pagada (no existe columna de estado).
--   - Vendido = suma de total_ars (lo realmente cobrado; ya incluye descuentos).
--   - Costo de una venta (ARS) = cantidad_docenas × costo_docena_usd × dolar_blue DE ESA VENTA.
--   - Una venta "con costo" tiene costo_docena_usd y dolar_blue > 0. Las demás ("sin costo") NO
--     entran en costo, ganancia, índice, markup ni margen (no se inventa un costo): se cuentan
--     aparte. Por eso ganancia = vendido_con_costo - costo, e índice, markup y margen se calculan
--     con vendido_con_costo.
--   - Índice = vendido_con_costo / costo; Markup % = ganancia / costo × 100;
--     Margen % = ganancia / vendido_con_costo × 100. Siempre con las SUMAS del grupo (nunca
--     promediando porcentajes). Sin ventas con costo -> null (no 0).
--   - Los períodos sin ventas aparecen con todo en 0 (índice, markup y margen en null), para que el
--     gráfico no salte días.
--   - cantidad_ventas = pedidos distintos (venta_id), no filas de productos.
--   - Dólares (vendido_usd, costo_usd, ganancia_usd): cada venta se convierte con SU propio dolar_blue
--     (nunca con el dólar de Precio Venta Sugerido): vendido_usd = total_ars / dolar_blue por venta y
--     luego se suma; costo_usd = cantidad_docenas × costo_docena_usd (ya está en dólares);
--     ganancia_usd = vendido_con_costo_usd - costo_usd. Una venta sin dolar_blue válido no se puede
--     pasar a dólares: no suma en los montos en USD y se cuenta en total.ventas_sin_dolar. El índice, el
--     markup y el margen son los mismos en pesos y en dólares.
--   - Redondeo solo al final: montos enteros, índice 3 decimales, markup y margen 1 decimal.
--   - "alertas" se calcula sobre TODAS las ventas (no solo el período):
--       sin_costo_con_vinculo: ventas con entrada_id y sin costo guardado (algo falló al
--                              registrarlas o falta el backfill) -> el dashboard las avisa.
--       grupos_sin_costo: esas mismas ventas (hasta 200 más recientes) agrupadas por boleta
--                         (tanda, marca, boleta) y motivo, con los productos de cada una. El motivo sale de
--                         calc_costo_docena_usd_detalle (migración 20261024_backfill_costo_docena_usd.sql,
--                         ejecutarla ANTES): 'sin_bultos' | 'sin_valor_compra' | 'faltan_datos' |
--                         'entrada_inexistente' | null (null = se puede calcular ahora: "Recalcular costos").
--       sin_costo_sin_vinculo: ventas históricas sin entrada_id (no se puede calcular su costo).
--       sin_dolar: ventas con costo pero sin dolar_blue válido (no se puede pasar a pesos).
--
-- Seguridad: SECURITY DEFINER, pero solo responde a un admin de Supabase Auth
-- (profiles.role = 'admin'). Cualquier otro usuario recibe un error de permiso.

-- p_dias (opcional): días de la semana a incluir, 1 = lunes ... 7 = domingo (ISO). NULL = todos.
--   Filtra las ventas por el día de la semana de ventas.fecha: tarjetas, gráfico y tablas suman solo
--   esos días. Con agrupación por día, los días excluidos tampoco aparecen en el gráfico.
-- (Se borra la firma anterior de 3 parámetros para no dejar dos versiones de la función.)
DROP FUNCTION IF EXISTS public.get_dashboard_ventas(date, date, text);

CREATE OR REPLACE FUNCTION public.get_dashboard_ventas(
  p_desde date,
  p_hasta date,
  p_agrupacion text DEFAULT 'dia',
  p_dias integer[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unidad text;
  v_paso interval;
  v_result jsonb;
  v_adv jsonb := '[]'::jsonb;
  v_sin_costo_periodo integer;
  v_con_vinculo integer;
  v_sin_vinculo integer;
  v_sin_dolar integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;
  IF p_desde IS NULL OR p_hasta IS NULL OR p_hasta < p_desde THEN
    RAISE EXCEPTION 'Período inválido' USING ERRCODE = '22023';
  END IF;
  IF p_hasta - p_desde > 800 THEN
    RAISE EXCEPTION 'Período demasiado largo (máximo 800 días)' USING ERRCODE = '22023';
  END IF;

  IF p_dias IS NOT NULL AND (cardinality(p_dias) = 0 OR EXISTS (SELECT 1 FROM unnest(p_dias) d WHERE d IS NULL OR d NOT BETWEEN 1 AND 7)) THEN
    RAISE EXCEPTION 'Días inválidos (1 = lunes ... 7 = domingo)' USING ERRCODE = '22023';
  END IF;

  IF p_agrupacion = 'dia' THEN
    v_unidad := 'day';   v_paso := interval '1 day';
  ELSIF p_agrupacion = 'semana' THEN
    v_unidad := 'week';  v_paso := interval '1 week';
  ELSIF p_agrupacion = 'mes' THEN
    v_unidad := 'month'; v_paso := interval '1 month';
  ELSE
    RAISE EXCEPTION 'Agrupación inválida (dia, semana o mes)' USING ERRCODE = '22023';
  END IF;

  WITH base AS (
    SELECT v.id, v.fecha, v.venta_id, v.producto_titulo, v.codigo, v.cantidad_docenas,
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
  periodos AS (
    SELECT gs::date AS periodo
      FROM generate_series(date_trunc(v_unidad, p_desde::timestamp),
                           p_hasta::timestamp, v_paso) AS gs
     WHERE p_dias IS NULL OR v_unidad <> 'day' OR extract(isodow FROM gs)::int = ANY(p_dias)
  ),
  agg AS (
    SELECT date_trunc(v_unidad, c.fecha::timestamp)::date AS periodo,
           SUM(c.total_ars)                                      AS vendido,
           SUM(c.total_ars) FILTER (WHERE c.con_costo)           AS vendido_con_costo,
           SUM(c.total_ars) FILTER (WHERE NOT c.con_costo)       AS vendido_sin_costo,
           SUM(c.costo_ars)                                      AS costo,
           SUM(c.vendido_usd)                                    AS vendido_usd,
           SUM(c.vendido_usd) FILTER (WHERE c.con_costo)         AS vendido_con_costo_usd,
           SUM(c.costo_usd)                                      AS costo_usd,
           COUNT(DISTINCT c.venta_id)                            AS cantidad_ventas,
           COUNT(*) FILTER (WHERE NOT c.con_costo)               AS lineas_sin_costo
      FROM calc c
     GROUP BY 1
  ),
  por_periodo AS (
    SELECT p.periodo,
           COALESCE(a.vendido, 0)           AS vendido,
           COALESCE(a.vendido_con_costo, 0) AS vendido_con_costo,
           COALESCE(a.vendido_sin_costo, 0) AS vendido_sin_costo,
           COALESCE(a.costo, 0)             AS costo,
           COALESCE(a.vendido_con_costo, 0) - COALESCE(a.costo, 0) AS ganancia,
           COALESCE(a.vendido_usd, 0)       AS vendido_usd,
           COALESCE(a.costo_usd, 0)         AS costo_usd,
           COALESCE(a.vendido_con_costo_usd, 0) - COALESCE(a.costo_usd, 0) AS ganancia_usd,
           COALESCE(a.cantidad_ventas, 0)   AS cantidad_ventas,
           COALESCE(a.lineas_sin_costo, 0)  AS lineas_sin_costo
      FROM periodos p
      LEFT JOIN agg a ON a.periodo = p.periodo
  ),
  total AS (
    SELECT COALESCE(SUM(c.total_ars), 0)                                  AS vendido,
           COALESCE(SUM(c.total_ars) FILTER (WHERE c.con_costo), 0)       AS vendido_con_costo,
           COALESCE(SUM(c.total_ars) FILTER (WHERE NOT c.con_costo), 0)   AS vendido_sin_costo,
           COALESCE(SUM(c.costo_ars), 0)                                  AS costo,
           COALESCE(SUM(c.vendido_usd), 0)                                AS vendido_usd,
           COALESCE(SUM(c.vendido_usd) FILTER (WHERE c.con_costo), 0)     AS vendido_con_costo_usd,
           COALESCE(SUM(c.costo_usd), 0)                                  AS costo_usd,
           COUNT(*) FILTER (WHERE c.vendido_usd IS NULL)                  AS lineas_sin_dolar,
           COUNT(DISTINCT c.venta_id)                                     AS cantidad_ventas,
           COUNT(*) FILTER (WHERE NOT c.con_costo)                        AS lineas_sin_costo
      FROM calc c
  ),
  alertas AS (
    SELECT COUNT(*) FILTER (WHERE entrada_id IS NOT NULL AND costo_docena_usd IS NULL) AS sin_costo_con_vinculo,
           COUNT(*) FILTER (WHERE entrada_id IS NULL AND costo_docena_usd IS NULL)     AS sin_costo_sin_vinculo,
           COUNT(*) FILTER (WHERE costo_docena_usd IS NOT NULL AND COALESCE(dolar_blue, 0) <= 0) AS sin_dolar
      FROM public.ventas
  ),
  lista_alerta AS (
    SELECT v.id, v.fecha, v.producto_titulo, v.codigo, v.cantidad_docenas, v.total_ars, v.registrado_por,
           e.tanda_nombre, e.marca, e.codigo_boleta, d.codigo AS motivo
      FROM public.ventas v
      LEFT JOIN public.entradas e ON e.id = v.entrada_id
      LEFT JOIN LATERAL public.calc_costo_docena_usd_detalle(v.entrada_id) d ON true
     WHERE v.entrada_id IS NOT NULL AND v.costo_docena_usd IS NULL
     ORDER BY v.fecha DESC, v.id DESC
     LIMIT 200
  )
  SELECT jsonb_build_object(
    'periodo', jsonb_build_object('desde', p_desde, 'hasta', p_hasta, 'agrupacion', p_agrupacion),
    'grafico', (
      SELECT jsonb_build_object(
        'labels',   COALESCE(jsonb_agg(to_char(pp.periodo, 'YYYY-MM-DD') ORDER BY pp.periodo), '[]'::jsonb),
        'vendido',  COALESCE(jsonb_agg(round(pp.vendido) ORDER BY pp.periodo), '[]'::jsonb),
        'ganancia', COALESCE(jsonb_agg(round(pp.ganancia) ORDER BY pp.periodo), '[]'::jsonb),
        'vendido_usd',  COALESCE(jsonb_agg(round(pp.vendido_usd, 2) ORDER BY pp.periodo), '[]'::jsonb),
        'ganancia_usd', COALESCE(jsonb_agg(round(pp.ganancia_usd, 2) ORDER BY pp.periodo), '[]'::jsonb)
      ) FROM por_periodo pp
    ),
    'por_dia', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'fecha',             to_char(pp.periodo, 'YYYY-MM-DD'),
        'vendido',           round(pp.vendido),
        'vendido_sin_costo', round(pp.vendido_sin_costo),
        'costo',             round(pp.costo),
        'ganancia',          round(pp.ganancia),
        'vendido_usd',       round(pp.vendido_usd, 2),
        'costo_usd',         round(pp.costo_usd, 2),
        'ganancia_usd',      round(pp.ganancia_usd, 2),
        'indice',            CASE WHEN pp.costo > 0 THEN round(pp.vendido_con_costo / pp.costo, 3) END,
        'markup',            CASE WHEN pp.costo > 0 THEN round(pp.ganancia / pp.costo * 100, 1) END,
        'margen',            CASE WHEN pp.vendido_con_costo > 0 THEN round(pp.ganancia / pp.vendido_con_costo * 100, 1) END,
        'cantidad_ventas',   pp.cantidad_ventas,
        'ventas_sin_costo',  pp.lineas_sin_costo
      ) ORDER BY pp.periodo), '[]'::jsonb) FROM por_periodo pp
    ),
    'total', (
      SELECT jsonb_build_object(
        'vendido',           round(t.vendido),
        'vendido_sin_costo', round(t.vendido_sin_costo),
        'costo',             round(t.costo),
        'ganancia',          round(t.vendido_con_costo - t.costo),
        'vendido_usd',       round(t.vendido_usd, 2),
        'costo_usd',         round(t.costo_usd, 2),
        'ganancia_usd',      round(t.vendido_con_costo_usd - t.costo_usd, 2),
        'ventas_sin_dolar',  t.lineas_sin_dolar,
        'indice',            CASE WHEN t.costo > 0 THEN round(t.vendido_con_costo / t.costo, 3) END,
        'markup',            CASE WHEN t.costo > 0 THEN round((t.vendido_con_costo - t.costo) / t.costo * 100, 1) END,
        'margen',            CASE WHEN t.vendido_con_costo > 0 THEN round((t.vendido_con_costo - t.costo) / t.vendido_con_costo * 100, 1) END,
        'cantidad_ventas',   t.cantidad_ventas,
        'ventas_sin_costo',  t.lineas_sin_costo
      ) FROM total t
    ),
    'alertas', (
      SELECT jsonb_build_object(
        'sin_costo_con_vinculo', a.sin_costo_con_vinculo,
        'sin_costo_sin_vinculo', a.sin_costo_sin_vinculo,
        'sin_dolar',             a.sin_dolar,
        'grupos_sin_costo', (
          SELECT COALESCE(jsonb_agg(to_jsonb(g) ORDER BY g.ventas DESC, g.tanda, g.marca, g.boleta), '[]'::jsonb)
            FROM (
              SELECT l.tanda_nombre AS tanda, l.marca, l.codigo_boleta AS boleta, l.motivo,
                     COUNT(*) AS ventas, round(SUM(l.total_ars)) AS vendido,
                     jsonb_agg(jsonb_build_object(
                       'id', l.id, 'fecha', to_char(l.fecha, 'YYYY-MM-DD'), 'producto', l.producto_titulo,
                       'codigo', l.codigo, 'cantidad', l.cantidad_docenas, 'registrado_por', l.registrado_por
                     ) ORDER BY l.fecha DESC, l.id DESC) AS productos
                FROM lista_alerta l
               GROUP BY l.tanda_nombre, l.marca, l.codigo_boleta, l.motivo
            ) g
        )
      ) FROM alertas a
    )
  )
  INTO v_result;

  -- Advertencias en texto
  v_sin_costo_periodo := (v_result->'total'->>'ventas_sin_costo')::integer;
  v_con_vinculo := (v_result->'alertas'->>'sin_costo_con_vinculo')::integer;
  v_sin_vinculo := (v_result->'alertas'->>'sin_costo_sin_vinculo')::integer;
  v_sin_dolar   := (v_result->'alertas'->>'sin_dolar')::integer;

  IF v_sin_costo_periodo > 0 THEN
    v_adv := v_adv || to_jsonb(format('%s ventas del período sin costo guardado, excluidas del cálculo de ganancia', v_sin_costo_periodo));
  END IF;
  IF v_con_vinculo > 0 THEN
    v_adv := v_adv || to_jsonb(format('%s ventas con producto vinculado no tienen costo guardado (revisar)', v_con_vinculo));
  END IF;
  IF v_sin_vinculo > 0 THEN
    v_adv := v_adv || to_jsonb(format('%s ventas históricas sin producto vinculado: no se puede calcular su costo', v_sin_vinculo));
  END IF;
  IF v_sin_dolar > 0 THEN
    v_adv := v_adv || to_jsonb(format('%s ventas con costo pero sin dólar válido: excluidas del cálculo de ganancia', v_sin_dolar));
  END IF;

  RETURN v_result || jsonb_build_object('advertencias', v_adv);
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_ventas(date, date, text, integer[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_ventas(date, date, text, integer[]) TO authenticated;

NOTIFY pgrst, 'reload schema';


