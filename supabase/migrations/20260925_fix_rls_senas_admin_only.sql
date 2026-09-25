-- Fix: restrict senas read/update/delete to admin role only
-- Previously any authenticated user (not just admins) could read, approve/reject
-- and delete any customer's seña — violates SECURITY_GUIDELINES.md rule 6.

DROP POLICY IF EXISTS "admin_read_senas"   ON senas;
DROP POLICY IF EXISTS "admin_update_senas" ON senas;
DROP POLICY IF EXISTS "admin_delete_senas" ON senas;

CREATE POLICY "admin_read_senas"
  ON senas FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admin_update_senas"
  ON senas FOR UPDATE TO authenticated
  USING (public.is_admin());

CREATE POLICY "admin_delete_senas"
  ON senas FOR DELETE TO authenticated
  USING (public.is_admin());
