import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Mendapatkan Supabase Client untuk operasi database di Server Components & Server Actions.
 * Mengutamakan Service Role Client (jika tersedia) agar operasi sistem dan RLS berjalan mulus.
 * Fallback ke Server Supabase Client berbasis cookie sesi.
 */
export async function getSupabaseDb() {
  if (process.env.NEXT_SERVICE_ROLE_KEY) {
    return createAdminSupabaseClient();
  }
  return await createServerSupabaseClient();
}
