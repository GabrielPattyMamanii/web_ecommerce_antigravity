-- Agrega columna de permisos a app_users para controlar qué secciones
-- del dashboard de usuario puede ver cada uno.
ALTER TABLE public.app_users
    ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;
