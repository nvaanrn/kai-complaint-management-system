-- ==============================================================================
-- Migration: storage_rls_policies
-- Project: SPKP (Sistem Pengaduan Keluhan Pelanggan - PT KAI)
-- Description: Menambahkan Row-Level Security (RLS) Policy untuk bucket Storage
--              'complaint-proofs' agar PIC & Staf KAI dapat mengunggah foto bukti.
-- ==============================================================================

-- 1. Pastikan bucket complaint-proofs ada dan berstatus public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'complaint-proofs',
    'complaint-proofs',
    true,
    5242880,
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']::text[];

-- 2. Hapus policy lama jika ada untuk mencegah duplikasi
DROP POLICY IF EXISTS "Public and authenticated can read complaint-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload complaint-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update complaint-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete complaint-proofs" ON storage.objects;

-- 3. Policy SELECT: Foto bukti keluhan dapat dilihat publik/petugas
CREATE POLICY "Public and authenticated can read complaint-proofs"
ON storage.objects
FOR SELECT
TO public, authenticated
USING (bucket_id = 'complaint-proofs');

-- 4. Policy INSERT: Seluruh pengguna terautentikasi (PIC, Admin, dll.) dapat mengunggah foto bukti
CREATE POLICY "Authenticated users can upload complaint-proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'complaint-proofs');

-- 5. Policy UPDATE: Pengguna terautentikasi dapat memperbarui foto bukti
CREATE POLICY "Authenticated users can update complaint-proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'complaint-proofs')
WITH CHECK (bucket_id = 'complaint-proofs');

-- 6. Policy DELETE: Admin dan personil terautentikasi dapat menghapus foto bukti
CREATE POLICY "Authenticated users can delete complaint-proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'complaint-proofs');
