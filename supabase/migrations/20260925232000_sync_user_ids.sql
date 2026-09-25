-- ==============================================================================
-- Migration: sync_user_ids
-- Project: SPKP (Sistem Pengaduan Keluhan Pelanggan - PT KAI)
-- Description: Sinkronisasi ID User dengan Supabase Auth (auth.users.id)
--              Memastikan foreign key di Complaint, Verification, Document selaras
--              dengan auth.uid() sehingga RLS dan filter "Tugas Saya" bekerja tepat.
-- ==============================================================================

-- 1. Update ID pada tabel "User" agar menggunakan UUID dari auth.users
-- Karena ada ON UPDATE CASCADE di semua foreign keys ("Complaint_picId_fkey", dll.),
-- update pada "User".id akan otomatis men-cascade update pada "Complaint"."picId"
-- dan "Verification"."verifierId".
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT u.id::text as auth_id, pu.id as old_id, u.email
        FROM auth.users u
        JOIN public."User" pu ON lower(u.email) = lower(pu.email)
        WHERE pu.id != u.id::text
    ) LOOP
        UPDATE public."User"
        SET id = r.auth_id
        WHERE id = r.old_id;

        RAISE NOTICE 'Sinkronisasi User %: ID lama % diubah ke Auth UUID %', r.email, r.old_id, r.auth_id;
    END LOOP;
END $$;

-- 2. Fungsi sinkronisasi otomatis profil User saat ada akun baru / update di auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role public."Role" := 'PIC';
    v_role_text TEXT;
BEGIN
    -- Ambil role dari raw_app_meta_data atau raw_user_meta_data
    v_role_text := COALESCE(
        NEW.raw_app_meta_data->>'role',
        NEW.raw_user_meta_data->>'role'
    );

    IF v_role_text IN ('ADMIN', 'PIC', 'VERIFIKATOR') THEN
        v_role := v_role_text::public."Role";
    END IF;

    INSERT INTO public."User" (id, name, email, password, role, "createdAt")
    VALUES (
        NEW.id::text,
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_app_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        NEW.email,
        '',
        v_role,
        NOW()
    )
    ON CONFLICT (email) DO UPDATE
    SET id = EXCLUDED.id,
        name = CASE WHEN public."User".name IS NULL OR public."User".name = '' THEN EXCLUDED.name ELSE public."User".name END,
        role = EXCLUDED.role;

    RETURN NEW;
END;
$$;

-- 3. Trigger pada auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
