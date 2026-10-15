-- ============================================================
-- Pantalla "Asignar propietario" (/admin/asignar-propietario)
-- ============================================================
-- Problema: se vende mercadería antes de saber de quién es. Las ventas guardan una copia del
-- dueño ('Sin propietario') y, al asignarle después un dueño al producto, esa copia no se
-- actualiza: el dinero queda repartido entre "Sin propietario" y el dueño nuevo en Entrega de
-- dinero, Historial de ventas y Cuentas bancarias.
--
-- Esta migración agrega:
--   1) reasignaciones_propietario: registro de cada reasignación (quién, cuándo, qué ventas)
--      para poder auditarla y deshacerla.
--   2) asignar_propietario(p_entrada_ids, p_propietario): en UNA transacción, le pone el dueño
--      al producto (propietario_producto) y pasa a ese dueño las ventas del producto que siguen
--      como 'Sin propietario' (se encuentran por ventas.entrada_id, no por texto).
--   3) deshacer_reasignacion(p_id): revierte una reasignación.
--
-- Reglas de seguridad de las funciones:
--   - Solo admin (public.is_admin()) o un perfil con el permiso 'asignar-propietario'.
--   - Nunca pisa un dueño ya asignado: si el producto ya tiene OTRO dueño, lo omite.
--   - Solo mueve ventas que siguen como 'Sin propietario' (no toca ventas ya asignadas).
--   - Cambiar solo ventas.propietario NO mueve stock: el trigger trg_ventas_reajusta_stock solo
--     actúa si cambia la cantidad o el entrada_id.
-- No modifica ningún dato existente al ejecutarse: solo crea objetos.

CREATE TABLE IF NOT EXISTS public.reasignaciones_propietario (
  id                            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                    timestamptz NOT NULL DEFAULT now(),
  usuario_id                    uuid        DEFAULT auth.uid(),
  usuario_email                 text,
  -- Sin FK a propósito: el registro debe sobrevivir aunque el producto se borre después
  entrada_id                    uuid,
  tanda_nombre                  text,
  marca                         text,
  codigo                        text,
  producto_titulo               text,
  propietario_nuevo             text        NOT NULL,
  propietario_anterior          text,        -- entradas.propietario antes del cambio (no se modifica)
  propietario_producto_anterior text,        -- entradas.propietario_producto antes del cambio
  entrada_modificada            boolean     NOT NULL DEFAULT false,
  venta_ids                     bigint[]    NOT NULL DEFAULT '{}',
  ventas_count                  integer     NOT NULL DEFAULT 0,
  total_ars                     numeric     NOT NULL DEFAULT 0,
  deshecho_at                   timestamptz,
  deshecho_por                  uuid
);

CREATE INDEX IF NOT EXISTS idx_reasignaciones_created ON public.reasignaciones_propietario (created_at DESC);

ALTER TABLE public.reasignaciones_propietario ENABLE ROW LEVEL SECURITY;

-- Lectura: admin o perfil con el permiso. Sin políticas de escritura: solo escriben las funciones.
DROP POLICY IF EXISTS "reasignaciones_select" ON public.reasignaciones_propietario;
CREATE POLICY "reasignaciones_select" ON public.reasignaciones_propietario
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = auth.uid() AND p.permissions ? 'asignar-propietario')
  );

-- ------------------------------------------------------------
-- asignar_propietario
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.asignar_propietario(
  p_entrada_ids uuid[],
  p_propietario text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner     text := btrim(COALESCE(p_propietario, ''));
  v_ent       record;
  v_actual    text;
  v_modif     boolean;
  v_ids       bigint[];
  v_total     numeric;
  v_productos integer := 0;
  v_ventas    integer := 0;
  v_monto     numeric := 0;
  v_omitidos  jsonb   := '[]'::jsonb;
BEGIN
  IF NOT (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = auth.uid() AND p.permissions ? 'asignar-propietario')
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_owner = '' OR v_owner = 'Sin propietario' THEN
    RAISE EXCEPTION 'Propietario inválido';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE username = v_owner) THEN
    RAISE EXCEPTION 'El propietario "%" no existe', v_owner;
  END IF;
  IF p_entrada_ids IS NULL OR cardinality(p_entrada_ids) = 0 THEN
    RAISE EXCEPTION 'No se indicó ningún producto';
  END IF;

  FOR v_ent IN
    SELECT * FROM public.entradas WHERE id = ANY(p_entrada_ids) FOR UPDATE
  LOOP
    v_actual := COALESCE(NULLIF(btrim(v_ent.propietario_producto), ''), NULLIF(btrim(v_ent.propietario), ''));

    -- Nunca se pisa un dueño distinto ya asignado
    IF v_actual IS NOT NULL AND v_actual <> v_owner THEN
      v_omitidos := v_omitidos || jsonb_build_object(
        'entrada_id', v_ent.id, 'codigo', v_ent.codigo,
        'motivo', 'ya tiene otro propietario: ' || v_actual);
      CONTINUE;
    END IF;

    -- 1) El producto: solo si todavía no tiene dueño
    v_modif := false;
    IF v_actual IS NULL THEN
      UPDATE public.entradas SET propietario_producto = v_owner WHERE id = v_ent.id;
      v_modif := true;
    END IF;

    -- 2) Las ventas del producto que siguen como 'Sin propietario' (vínculo exacto por entrada_id)
    SELECT COALESCE(array_agg(id::bigint), '{}'), COALESCE(sum(total_ars), 0)
      INTO v_ids, v_total
      FROM public.ventas
     WHERE entrada_id = v_ent.id AND propietario = 'Sin propietario';

    IF cardinality(v_ids) > 0 THEN
      UPDATE public.ventas SET propietario = v_owner WHERE id = ANY(v_ids);
    END IF;

    -- 3) Registro (solo si algo cambió)
    IF v_modif OR cardinality(v_ids) > 0 THEN
      INSERT INTO public.reasignaciones_propietario (
        usuario_email, entrada_id, tanda_nombre, marca, codigo, producto_titulo,
        propietario_nuevo, propietario_anterior, propietario_producto_anterior,
        entrada_modificada, venta_ids, ventas_count, total_ars
      ) VALUES (
        auth.jwt() ->> 'email', v_ent.id, v_ent.tanda_nombre, v_ent.marca, v_ent.codigo, v_ent.producto_titulo,
        v_owner, v_ent.propietario, v_ent.propietario_producto,
        v_modif, v_ids, cardinality(v_ids), v_total
      );
      v_productos := v_productos + 1;
      v_ventas    := v_ventas + cardinality(v_ids);
      v_monto     := v_monto + v_total;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'productos', v_productos,
    'ventas',    v_ventas,
    'total_ars', v_monto,
    'omitidos',  v_omitidos
  );
END;
$$;

-- ------------------------------------------------------------
-- deshacer_reasignacion
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deshacer_reasignacion(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_r        public.reasignaciones_propietario%ROWTYPE;
  v_ventas   integer := 0;
  v_producto boolean := false;
BEGIN
  IF NOT (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = auth.uid() AND p.permissions ? 'asignar-propietario')
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT * INTO v_r FROM public.reasignaciones_propietario WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe la reasignación';
  END IF;
  IF v_r.deshecho_at IS NOT NULL THEN
    RAISE EXCEPTION 'Esta reasignación ya fue deshecha';
  END IF;

  -- Ventas: vuelven a 'Sin propietario' solo las que siguen con el dueño asignado
  UPDATE public.ventas
     SET propietario = 'Sin propietario'
   WHERE id = ANY(v_r.venta_ids) AND propietario = v_r.propietario_nuevo;
  GET DIAGNOSTICS v_ventas = ROW_COUNT;

  -- Producto: se restaura solo si lo cambió esta reasignación y sigue con el dueño asignado
  IF v_r.entrada_modificada AND v_r.entrada_id IS NOT NULL THEN
    UPDATE public.entradas
       SET propietario_producto = v_r.propietario_producto_anterior
     WHERE id = v_r.entrada_id AND propietario_producto = v_r.propietario_nuevo;
    v_producto := FOUND;
  END IF;

  UPDATE public.reasignaciones_propietario
     SET deshecho_at = now(), deshecho_por = auth.uid()
   WHERE id = p_id;

  RETURN jsonb_build_object('ventas', v_ventas, 'producto_restaurado', v_producto);
END;
$$;

-- Solo usuarios autenticados pueden ejecutarlas (la validación de permisos está dentro)
REVOKE ALL ON FUNCTION public.asignar_propietario(uuid[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deshacer_reasignacion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asignar_propietario(uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deshacer_reasignacion(uuid) TO authenticated;
