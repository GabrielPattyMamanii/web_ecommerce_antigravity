-- Fix: normalizar registrado_por de email a username en ventas existentes.
-- Algunas ventas legacy guardaron el email en vez del username.
-- Este UPDATE resuelve eso sin exponer emails al frontend.
UPDATE public.ventas v
SET registrado_por = au.username
FROM public.app_users au
WHERE v.registrado_por = au.email
  AND v.registrado_por IS NOT NULL
  AND au.username IS NOT NULL;
