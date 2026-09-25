import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin client khusus Server-side (Service Role).
 * Bypass RLS untuk operasi sistem dan sinkronisasi akun.
 */
export function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.NEXT_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("NEXT_SERVICE_ROLE_KEY is not defined in environment variables");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
