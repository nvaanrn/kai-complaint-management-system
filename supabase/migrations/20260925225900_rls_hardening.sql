-- ==============================================================================
-- Migration: rls_hardening
-- Project: SPKP (Sistem Pengaduan Keluhan Pelanggan - PT KAI)
-- Description: Pengetatan Row Level Security dengan JWT claim check.
--   Setiap mutasi (INSERT/UPDATE/DELETE) kini dibatasi oleh `role` yang tersimpan
--   di `auth.jwt() -> 'app_metadata' -> 'role'` (server-controlled, tidak bisa
--   dimanipulasi user).
--
-- Standar Supabase yang diterapkan:
--   1. Gunakan TO clause, bukan auth.role() (deprecated).
--   2. Gunakan (select auth.uid()) bukan auth.uid() langsung (mencegah re-eval per row).
--   3. UPDATE policy wajib punya USING + WITH CHECK.
--   4. Role diambil dari app_metadata (aman), bukan user_metadata (user-editable).
-- ==============================================================================

-- Helper function: ambil role dari JWT app_metadata (server-controlled)
-- SECURITY INVOKER agar berjalan di bawah hak user yang memanggilnya, bukan superuser
CREATE OR REPLACE FUNCTION auth.get_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  );
$$;

-- ==============================================================================
-- TABLE: User
-- Hak akses:
--   - service_role: Full access (sudah ada, tidak diubah)
--   - authenticated read: Full SELECT (sudah ada, tidak diubah)
--   - INSERT/UPDATE/DELETE: Hanya ADMIN
-- ==============================================================================

-- Hapus policy lama jika ada sebelum buat baru (idempotent)
DROP POLICY IF EXISTS "Admin can insert User" ON "User";
DROP POLICY IF EXISTS "Admin can update User" ON "User";
DROP POLICY IF EXISTS "Admin can delete User" ON "User";

CREATE POLICY "Admin can insert User" ON "User"
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.get_role() = 'ADMIN');

CREATE POLICY "Admin can update User" ON "User"
    FOR UPDATE
    TO authenticated
    USING      (auth.get_role() = 'ADMIN')
    WITH CHECK (auth.get_role() = 'ADMIN');

CREATE POLICY "Admin can delete User" ON "User"
    FOR DELETE
    TO authenticated
    USING (auth.get_role() = 'ADMIN');

-- ==============================================================================
-- TABLE: Complaint
-- Hak akses:
--   - service_role: Full access (sudah ada)
--   - authenticated read: Full SELECT (sudah ada)
--   - INSERT: ADMIN (pencatatan keluhan baru oleh CS / Admin)
--   - UPDATE status awal & assign PIC: ADMIN
--   - UPDATE tindakan (correctiveAction, preventiveAction, dll): PIC yang ditugaskan
--   - UPDATE status verifikasi: VERIFIKATOR atau ADMIN
--   - DELETE: ADMIN
-- ==============================================================================

DROP POLICY IF EXISTS "Admin can insert Complaint" ON "Complaint";
DROP POLICY IF EXISTS "Admin can assign PIC on Complaint" ON "Complaint";
DROP POLICY IF EXISTS "PIC can update assigned Complaint" ON "Complaint";
DROP POLICY IF EXISTS "Verifikator can update Complaint status" ON "Complaint";
DROP POLICY IF EXISTS "Admin can delete Complaint" ON "Complaint";

-- Admin bisa insert keluhan baru
CREATE POLICY "Admin can insert Complaint" ON "Complaint"
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.get_role() = 'ADMIN');

-- Admin bisa update semua field (assign PIC, edit detail, dll)
CREATE POLICY "Admin can update any Complaint" ON "Complaint"
    FOR UPDATE
    TO authenticated
    USING      (auth.get_role() = 'ADMIN')
    WITH CHECK (auth.get_role() = 'ADMIN');

-- PIC hanya bisa update keluhan yang ditugaskan kepadanya
CREATE POLICY "PIC can update assigned Complaint" ON "Complaint"
    FOR UPDATE
    TO authenticated
    USING (
        auth.get_role() = 'PIC'
        AND "picId" = (select auth.uid())::text
    )
    WITH CHECK (
        auth.get_role() = 'PIC'
        AND "picId" = (select auth.uid())::text
    );

-- Verifikator bisa update status keluhan (MENUNGGU_VERIFIKASI -> TERVERIFIKASI / DALAM_PENANGANAN)
CREATE POLICY "Verifikator can update Complaint status" ON "Complaint"
    FOR UPDATE
    TO authenticated
    USING      (auth.get_role() = 'VERIFIKATOR')
    WITH CHECK (auth.get_role() = 'VERIFIKATOR');

-- Hanya Admin yang bisa menghapus keluhan
CREATE POLICY "Admin can delete Complaint" ON "Complaint"
    FOR DELETE
    TO authenticated
    USING (auth.get_role() = 'ADMIN');

-- ==============================================================================
-- TABLE: Verification
-- Hak akses:
--   - service_role: Full access (sudah ada)
--   - authenticated read: Full SELECT (sudah ada)
--   - INSERT: VERIFIKATOR atau ADMIN
--   - UPDATE/DELETE: Tidak diizinkan via authenticated (immutable audit trail)
-- ==============================================================================

DROP POLICY IF EXISTS "Verifikator can insert Verification" ON "Verification";
DROP POLICY IF EXISTS "Admin can insert Verification" ON "Verification";

-- Verifikator dan Admin bisa membuat record verifikasi baru
CREATE POLICY "Verifikator can insert Verification" ON "Verification"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.get_role() IN ('VERIFIKATOR', 'ADMIN')
        AND "verifierId" = (select auth.uid())::text
    );

-- Verification bersifat immutable audit trail: tidak ada UPDATE/DELETE policy
-- untuk role authenticated. Hanya service_role yang bisa mengubahnya.

-- ==============================================================================
-- TABLE: Document
-- Hak akses:
--   - service_role: Full access (sudah ada)
--   - authenticated read: Full SELECT (sudah ada)
--   - INSERT: ADMIN
--   - UPDATE/DELETE: ADMIN
-- ==============================================================================

DROP POLICY IF EXISTS "Admin can insert Document" ON "Document";
DROP POLICY IF EXISTS "Admin can update Document" ON "Document";
DROP POLICY IF EXISTS "Admin can delete Document" ON "Document";

CREATE POLICY "Admin can insert Document" ON "Document"
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.get_role() = 'ADMIN');

CREATE POLICY "Admin can update Document" ON "Document"
    FOR UPDATE
    TO authenticated
    USING      (auth.get_role() = 'ADMIN')
    WITH CHECK (auth.get_role() = 'ADMIN');

CREATE POLICY "Admin can delete Document" ON "Document"
    FOR DELETE
    TO authenticated
    USING (auth.get_role() = 'ADMIN');
