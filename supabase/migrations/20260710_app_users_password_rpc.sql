-- RPCs faltantes para gestión de contraseñas de app_users (panel /admin/usuarios).
-- El frontend (src/pages/admin/Usuarios.jsx) ya llama a estas funciones desde
-- el commit b5941ab, pero nunca se habían creado en la base de datos, lo que
-- causaba: "Could not find the function public.update_app_user_password... in
-- the schema cache".
--
-- SECURITY DEFINER: corren con privilegios del owner para poder hashear y
-- escribir la columna password (bypassean RLS de app_users), por lo que cada
-- función valida public.is_admin() manualmente al inicio -- la misma regla de
-- autorización que ya protege el UPDATE directo de la tabla vía RLS
-- ("Admins can update app_users" en 20260612_rls_app_users.sql).
--
-- search_path = public, extensions: en Supabase pgcrypto se instala por
-- defecto en el esquema "extensions", no en "public". Con search_path
-- restringido solo a "public", crypt()/gen_salt() no se encuentran
-- ("function gen_salt(unknown, integer) does not exist"). Se agrega
-- "extensions" para que sigan siendo resolubles sin schema-qualify.

CREATE OR REPLACE FUNCTION public.update_app_user_password(
  p_user_id      UUID,
  p_new_password TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF length(p_new_password) < 12 THEN
    RAISE EXCEPTION 'La contraseña debe tener al menos 12 caracteres';
  END IF;

  UPDATE public.app_users
  SET password = crypt(p_new_password, gen_salt('bf', 10))
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_app_user(
  p_username    TEXT,
  p_email       TEXT,
  p_password    TEXT,
  p_permissions JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF length(p_password) < 12 THEN
    RAISE EXCEPTION 'La contraseña debe tener al menos 12 caracteres';
  END IF;

  INSERT INTO public.app_users (username, email, password, permissions)
  VALUES (p_username, p_email, crypt(p_password, gen_salt('bf', 10)), p_permissions)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- Re-aplica verify_app_user_password (creada en 20260609_hash_app_users_passwords.sql)
-- con el mismo fix de search_path -- tiene la misma dependencia de crypt()/pgcrypto
-- y estaba expuesta al mismo bug potencial en el login.
CREATE OR REPLACE FUNCTION public.verify_app_user_password(
  p_email    TEXT,
  p_password TEXT
)
RETURNS TABLE (
  id          UUID,
  username    TEXT,
  permissions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, u.permissions
  FROM public.app_users u
  WHERE u.email = lower(trim(p_email))
    AND u.password = crypt(p_password, u.password);
END;
$$;
