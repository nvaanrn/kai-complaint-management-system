import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client khusus Client Components (Browser).
 * Aman di-bundle di client-side karena tidak mengimpor next/headers.
 */
export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
