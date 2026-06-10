-- Agrega columnas al profiles para el sistema de usuarios staff del panel admin

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS email       TEXT,
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Función auxiliar que verifica si el uid actual es admin (SECURITY DEFINER evita recursión en RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Política: cada usuario puede leer su propio perfil (puede existir, la dejamos idempotente)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON public.profiles FOR SELECT
      TO authenticated
      USING (id = auth.uid());
  END IF;
END $$;

-- Política: el admin puede leer todos los perfiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Admin can read all profiles'
  ) THEN
    CREATE POLICY "Admin can read all profiles"
      ON public.profiles FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;

-- Política: el admin puede actualizar todos los perfiles (para editar permisos)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Admin can update all profiles'
  ) THEN
    CREATE POLICY "Admin can update all profiles"
      ON public.profiles FOR UPDATE
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;
