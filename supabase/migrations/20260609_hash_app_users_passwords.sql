-- Habilita pgcrypto para hashing con bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hashea todas las contraseñas existentes en texto plano.
-- El prefijo $2a$ / $2b$ identifica hashes bcrypt ya procesados (idempotente).
UPDATE public.app_users
SET password = crypt(password, gen_salt('bf', 10))
WHERE password NOT LIKE '$2a$%'
  AND password NOT LIKE '$2b$%';

-- Función RPC: recibe email + contraseña en texto plano, devuelve la fila si coincide.
-- SECURITY DEFINER: corre con privilegios del owner, el cliente nunca ve el hash.
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
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, u.permissions
  FROM public.app_users u
  WHERE u.email = lower(trim(p_email))
    AND u.password = crypt(p_password, u.password);
END;
$$;
