-- RPC segura para obtener permisos de un app_user por ID.
-- SECURITY DEFINER: corre con privilegios del owner (bypassa RLS),
-- pero solo expone el campo permissions — nunca passwords ni datos sensibles.
CREATE OR REPLACE FUNCTION public.get_app_user_permissions(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(permissions, '[]'::jsonb)
  FROM public.app_users
  WHERE id = p_user_id;
$$;
