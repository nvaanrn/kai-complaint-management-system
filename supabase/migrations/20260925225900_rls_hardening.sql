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
--   5. Helper function di schema public (bukan auth — reserved Supabase internal).
--      REVOKE EXECUTE dari PUBLIC agar hanya digunakan via RLS, bukan exposed ke anon.
-- ==============================================================================

-- Helper function di schema PUBLIC (schema auth reserved oleh Supabase internal)
-- Membaca role dari JWT app_metadata yang di-set oleh service_role saat createUser
CREATE OR REPLACE FUNCTION public.get_jwt_role()
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

-- Cabut akses EXECUTE dari PUBLIC (default Postgres grant semua fungsi ke PUBLIC)
-- Agar fungsi ini tidak bisa dipanggil langsung oleh anon / authenticated dari luar RLS
REVOKE EXECUTE ON FUNCTION public.get_jwt_role() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_jwt_role() TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_jwt_role() TO service_role;

-- ==============================================================================
-- TABLE: User
-- Hak akses:
--   - service_role: Full access (sudah ada, tidak diubah)
--   - authenticated read: Full SELECT (sudah ada, tidak diubah)
--   - INSERT/UPDATE/DELETE: Hanya ADMIN
-- ==============================================================================

DROP POLICY IF EXISTS "Admin can insert User" ON "User";
DROP POLICY IF EXISTS "Admin can update User" ON "User";
DROP POLICY IF EXISTS "Admin can delete User" ON "User";

CREATE POLICY "Admin can insert User" ON "User"
    FOR INSERT
    TO authenticated
    WITH CHECK (public.get_jwt_role() = 'ADMIN');

CREATE POLICY "Admin can update User" ON "User"
    FOR UPDATE
    TO authenticated
    USING      (public.get_jwt_role() = 'ADMIN')
    WITH CHECK (public.get_jwt_role() = 'ADMIN');

CREATE POLICY "Admin can delete User" ON "User"
    FOR DELETE
    TO authenticated
    USING (public.get_jwt_role() = 'ADMIN');

-- ==============================================================================
-- TABLE: Complaint
-- Hak akses:
--   - service_role: Full access (sudah ada)
--   - authenticated read: Full SELECT (sudah ada)
--   - INSERT: ADMIN
--   - UPDATE: ADMIN (semua field) | PIC (keluhan miliknya) | VERIFIKATOR (status)
--   - DELETE: ADMIN
-- ==============================================================================

DROP POLICY IF EXISTS "Admin can insert Complaint" ON "Complaint";
DROP POLICY IF EXISTS "Admin can assign PIC on Complaint" ON "Complaint";
DROP POLICY IF EXISTS "Admin can update any Complaint" ON "Complaint";
DROP POLICY IF EXISTS "PIC can update assigned Complaint" ON "Complaint";
DROP POLICY IF EXISTS "Verifikator can update Complaint status" ON "Complaint";
DROP POLICY IF EXISTS "Admin can delete Complaint" ON "Complaint";

CREATE POLICY "Admin can insert Complaint" ON "Complaint"
    FOR INSERT
    TO authenticated
    WITH CHECK (public.get_jwt_role() = 'ADMIN');

CREATE POLICY "Admin can update any Complaint" ON "Complaint"
    FOR UPDATE
    TO authenticated
    USING      (public.get_jwt_role() = 'ADMIN')
    WITH CHECK (public.get_jwt_role() = 'ADMIN');

-- PIC hanya bisa update keluhan yang ditugaskan kepadanya
CREATE POLICY "PIC can update assigned Complaint" ON "Complaint"
    FOR UPDATE
    TO authenticated
    USING (
        public.get_jwt_role() = 'PIC'
        AND "picId" = (select auth.uid())::text
    )
    WITH CHECK (
        public.get_jwt_role() = 'PIC'
        AND "picId" = (select auth.uid())::text
    );

-- Verifikator update status keluhan (MENUNGGU_VERIFIKASI -> TERVERIFIKASI / DALAM_PENANGANAN)
CREATE POLICY "Verifikator can update Complaint status" ON "Complaint"
    FOR UPDATE
    TO authenticated
    USING      (public.get_jwt_role() = 'VERIFIKATOR')
    WITH CHECK (public.get_jwt_role() = 'VERIFIKATOR');

CREATE POLICY "Admin can delete Complaint" ON "Complaint"
    FOR DELETE
    TO authenticated
    USING (public.get_jwt_role() = 'ADMIN');

-- ==============================================================================
-- TABLE: Verification
-- Hak akses:
--   - service_role: Full access (sudah ada)
--   - authenticated read: Full SELECT (sudah ada)
--   - INSERT: VERIFIKATOR atau ADMIN (hanya atas nama dirinya sendiri)
--   - UPDATE/DELETE: Tidak diizinkan — immutable audit trail
-- ==============================================================================

DROP POLICY IF EXISTS "Verifikator can insert Verification" ON "Verification";
DROP POLICY IF EXISTS "Admin can insert Verification" ON "Verification";

CREATE POLICY "Verifikator can insert Verification" ON "Verification"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_jwt_role() IN ('VERIFIKATOR', 'ADMIN')
        AND "verifierId" = (select auth.uid())::text
    );

-- Verification bersifat immutable: tidak ada UPDATE/DELETE policy untuk authenticated.

-- ==============================================================================
-- TABLE: Document
-- Hak akses:
--   - service_role: Full access (sudah ada)
--   - authenticated read: Full SELECT (sudah ada)
--   - INSERT/UPDATE/DELETE: ADMIN
-- ==============================================================================

DROP POLICY IF EXISTS "Admin can insert Document" ON "Document";
DROP POLICY IF EXISTS "Admin can update Document" ON "Document";
DROP POLICY IF EXISTS "Admin can delete Document" ON "Document";

CREATE POLICY "Admin can insert Document" ON "Document"
    FOR INSERT
    TO authenticated
    WITH CHECK (public.get_jwt_role() = 'ADMIN');

CREATE POLICY "Admin can update Document" ON "Document"
    FOR UPDATE
    TO authenticated
    USING      (public.get_jwt_role() = 'ADMIN')
    WITH CHECK (public.get_jwt_role() = 'ADMIN');

CREATE POLICY "Admin can delete Document" ON "Document"
    FOR DELETE
    TO authenticated
    USING (public.get_jwt_role() = 'ADMIN');
