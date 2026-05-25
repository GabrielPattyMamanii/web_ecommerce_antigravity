-- ============================================
-- POLÍTICAS DE SEGURIDAD PARA BUCKET tanda-fotos
-- ============================================
-- Ejecuta estos comandos en Supabase SQL Editor

-- 1. Permitir que usuarios autenticados SUBAN fotos
CREATE POLICY "Authenticated users can upload tanda photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tanda-fotos');

-- 2. Permitir que usuarios autenticados VEAN fotos
CREATE POLICY "Authenticated users can view tanda photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'tanda-fotos');

-- 3. Permitir que usuarios autenticados ELIMINEN fotos
CREATE POLICY "Authenticated users can delete tanda photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tanda-fotos');

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Después de ejecutar, verifica que las políticas se crearon:
-- SELECT * FROM storage.policies WHERE bucket_id = 'tanda-fotos';
