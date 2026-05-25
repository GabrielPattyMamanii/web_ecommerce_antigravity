-- Add fotos column to entradas table
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS fotos text[];

-- Create storage bucket for tanda photos
-- Note: This needs to be run in Supabase Dashboard or via Supabase CLI
-- INSERT INTO storage.buckets (id, name, public) VALUES ('tanda-fotos', 'tanda-fotos', false);

-- Storage Policies for tanda-fotos bucket
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload tanda photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tanda-fotos');

-- Allow authenticated users to view
CREATE POLICY "Authenticated users can view tanda photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'tanda-fotos');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete tanda photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tanda-fotos');
