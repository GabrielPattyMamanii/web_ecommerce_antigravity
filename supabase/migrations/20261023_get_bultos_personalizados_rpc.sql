-- RPC para leer los bultos personalizados por marca de una o varias tandas.
--
-- Por qué: `tandas` tiene RLS y solo el admin la puede leer. Los app_users (login liviano, sin
-- auth.uid()) y los usuarios con permisos parciales no pueden, y sin ese dato el costo de las
-- marcas con bultos personalizados se calcula sin el flete (ver
-- problemas/costo_distinto_bultos_personalizados.md).
--
-- SECURITY DEFINER: bypassa RLS pero solo devuelve { tanda: { marca_id_o_marca: bultos } },
-- nunca el resto de `parametros`.
--
-- Qué devuelve:
--   - { tanda: { marca: bultos } }  -> consulta válida. Si ninguna marca tiene bultos
--                                      personalizados, devuelve '{}' (significa "no tiene").
--   - NULL                          -> el usuario NO tiene permiso (o no se pudo identificar).
--                                      Significa "no pude saber": quien llama NO debe asumir que
--                                      la marca no tiene bultos personalizados (para el costo de
--                                      una venta hay que guardar NULL en vez de un costo sin flete).
--
-- Un valor no numérico en bultos_personalizados (p. ej. "5 bultos") se ignora; antes hacía
-- fallar toda la llamada.
--
-- Se puede ejecutar más de una vez: CREATE OR REPLACE reemplaza la versión anterior.

CREATE OR REPLACE FUNCTION public.get_bultos_personalizados(
  p_tandas text[],
  p_app_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secciones text[] := ARRAY['ventas', 'ventas-historial', 'precio-venta-sugerido'];
  v_allowed boolean := false;
  v_perms jsonb;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT (role = 'admin') OR (COALESCE(permissions, '[]'::jsonb) ?| v_secciones)
      INTO v_allowed
      FROM public.profiles
      WHERE id = auth.uid();
  ELSIF p_app_user_id IS NOT NULL THEN
    SELECT COALESCE(permissions, '[]'::jsonb)
      INTO v_perms
      FROM public.app_users
      WHERE id = p_app_user_id;
    v_allowed := COALESCE(v_perms ?| v_secciones, false);
  END IF;

  IF NOT COALESCE(v_allowed, false) THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_object_agg(x.nombre, x.marcas), '{}'::jsonb)
    INTO v_result
    FROM (
      SELECT t.nombre,
             jsonb_object_agg(e.key, e.bultos) AS marcas
        FROM (
          SELECT t2.nombre,
                 m.key,
                 CASE
                   WHEN (m.value->>'bultos_personalizados') ~ '^[0-9]+(\.[0-9]+)?$'
                     THEN (m.value->>'bultos_personalizados')::numeric
                   ELSE 0
                 END AS bultos
            FROM public.tandas t2,
                 jsonb_each(COALESCE(t2.parametros->'marcasMetadata', '{}'::jsonb)) AS m
           WHERE t2.nombre = ANY(p_tandas)
        ) e
        JOIN public.tandas t ON t.nombre = e.nombre
       WHERE e.bultos > 0
       GROUP BY t.nombre
    ) x;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_bultos_personalizados(text[], uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bultos_personalizados(text[], uuid) TO anon, authenticated;

-- Hace que Supabase (PostgREST) reconozca la función enseguida, sin esperar a recargar su caché.
NOTIFY pgrst, 'reload schema';

-- Verificación (solo lectura):
--   1) ¿Existe la función?
--        select proname from pg_proc where proname = 'get_bultos_personalizados';
--   2) El SQL Editor NO tiene sesión de usuario (auth.uid() es NULL), así que sin p_app_user_id
--      la función devuelve NULL a propósito. Para probarla desde ahí, pasá el id de un usuario de
--      la tabla app_users que tenga el permiso 'ventas':
--        select public.get_bultos_personalizados(array['PRIMERA TANDA OCTUBRE'], '<id del app_user>');
--      Debe devolver la marca de la boleta 000491 con 5 bultos.
--   3) La prueba real es desde la app, con una sesión de admin o de un usuario con permiso.
