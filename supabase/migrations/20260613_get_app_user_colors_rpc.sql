-- RPC segura para obtener username y color de todos los app_users.
-- SECURITY DEFINER: corre con privilegios del owner (bypassa RLS),
-- permite que usuarios staff (sin sesión Auth) obtengan los colores
-- necesarios para el UI de ventas. Solo expone username y color — nunca
-- passwords ni datos sensibles.
CREATE OR REPLACE FUNCTION public.get_app_user_colors()
RETURNS TABLE(username text, color text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT username, color
  FROM public.app_users
  WHERE username IS NOT NULL;
$$;
