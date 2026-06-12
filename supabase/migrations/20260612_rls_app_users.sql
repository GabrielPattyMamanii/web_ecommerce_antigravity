-- CRITICAL FIX: Enable RLS on app_users table
-- Without this, any authenticated Supabase user can SELECT all rows
-- including usernames, emails, password hashes, and permissions.
--
-- Las RPCs verify_app_user_password y get_app_user_permissions usan
-- SECURITY DEFINER, por lo que bypassean RLS y siguen funcionando.

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Solo admins Supabase pueden leer/escribir directamente la tabla
CREATE POLICY "Admins can select app_users" ON public.app_users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert app_users" ON public.app_users
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update app_users" ON public.app_users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete app_users" ON public.app_users
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
