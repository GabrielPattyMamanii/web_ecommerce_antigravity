-- Oculta ventas.costo_docena_usd: deja de ser legible con la clave pública (anon) y con sesión
-- (authenticated). Solo la leen las RPC SECURITY DEFINER del dashboard (get_dashboard_ventas,
-- get_ventas_periodo, recalcular_costos_ventas, calc_costo_docena_usd), que son solo admin.
--
-- Por qué: ventas se puede leer con la clave pública del front (política "ventas_all" USING (true)),
-- y con el costo guardado ahí quedaban expuestos costos y márgenes. Esta migración cierra SOLO esa
-- columna; el cierre del resto de la tabla es otra tarea (problemas/TAREA_CERRAR_ACCESO_PUBLICO_VENTAS.md).
--
-- Qué NO cambia: anon y authenticated siguen pudiendo INSERT/UPDATE/DELETE en ventas (también la
-- columna del costo), y leer todas las demás columnas.
--
-- ORDEN IMPORTANTE: ejecutar DESPUÉS de publicar la web con el cambio de VentasHistorial.jsx (ya no usa
-- select('*')). Con el código viejo, pedir "*" fallaría con "permission denied for table ventas".
--
-- Mantenimiento: una columna NUEVA de ventas no queda legible para anon/authenticated hasta que se
-- ejecute GRANT SELECT (nueva_columna) ON public.ventas TO anon, authenticated;
--
-- VUELTA ATRÁS (restaura la lectura de todas las columnas):
--   GRANT SELECT ON public.ventas TO anon, authenticated;
--
-- Verificación (con la clave pública, solo lectura):
--   GET /rest/v1/ventas?select=id,total_ars&limit=1          -> debe devolver datos
--   GET /rest/v1/ventas?select=costo_docena_usd&limit=1      -> debe dar "permission denied for table ventas"
--   GET /rest/v1/ventas?select=*&limit=1                     -> también da permission denied (esperado)

DO $$
DECLARE
  v_cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'ventas'
     AND column_name <> 'costo_docena_usd';

  IF v_cols IS NULL THEN
    RAISE EXCEPTION 'No se encontraron columnas de public.ventas';
  END IF;

  -- Se quita el permiso de lectura de toda la tabla y se devuelve columna por columna, salvo el costo
  REVOKE SELECT ON public.ventas FROM anon, authenticated;
  EXECUTE format('GRANT SELECT (%s) ON public.ventas TO anon, authenticated', v_cols);
END;
$$;

NOTIFY pgrst, 'reload schema';
