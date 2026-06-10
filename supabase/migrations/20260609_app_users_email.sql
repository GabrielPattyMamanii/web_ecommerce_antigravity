-- Agrega columna email a app_users
ALTER TABLE public.app_users
    ADD COLUMN IF NOT EXISTS email TEXT;
