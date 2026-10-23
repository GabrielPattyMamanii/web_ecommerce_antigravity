-- Fix: "new row violates row-level security policy for table tandas" al guardar
-- los bultos personalizados (y demás parámetros) desde AgregarTanda.
--
-- La tabla tandas tiene RLS activo pero ninguna policy que deje al admin escribir
-- (las policies de tandas no estaban versionadas en el repo). Las policies
-- permisivas se combinan con OR, así que esto no quita acceso a nadie que ya lo tenga.

ALTER TABLE public.tandas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage tandas" ON public.tandas;

CREATE POLICY "Admins can manage tandas" ON public.tandas
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
