import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Role } from "@/types/database";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/**
 * Mendapatkan data pengguna yang sedang login berdasarkan sesi Supabase Auth yang terverifikasi.
 *
 * Standar Resmi Supabase (@supabase/ssr):
 * - Menggunakan getUser() di sisi server (bukan getSession()) untuk memvalidasi token JWT
 *   ke Supabase Auth server — bukan hanya membaca cookie lokal.
 * - Role HANYA diambil dari app_metadata.role (klaim server-side yang tidak bisa diubah user).
 * - TIDAK menggunakan user_metadata.role karena user_metadata dapat diedit oleh user sendiri
 *   via Supabase client (rawan privilege escalation).
 * - Jika app_metadata.role tidak ada atau tidak valid, return null untuk mencegah akses tanpa role.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || !user.email) {
      return null;
    }

    // ✅ Supabase Standard: Role HANYA dari app_metadata (server-controlled, tidak bisa diubah user)
    // app_metadata di-set oleh service_role saat createUser/updateUserById di seed-supabase-auth.ts
    const role = user.app_metadata?.role as Role | undefined;

    // Tolak akses jika role tidak terdefinisi atau tidak valid di app_metadata
    const validRoles: Role[] = [Role.ADMIN, Role.PIC, Role.VERIFIKATOR];
    if (!role || !validRoles.includes(role)) {
      console.warn(
        `[Auth] User ${user.email} tidak memiliki app_metadata.role yang valid. ` +
        `Jalankan 'npm run seed:auth' untuk menyetel role melalui Supabase Admin API.`
      );
      return null;
    }

    // Nama dari user_metadata saja (bukan untuk otorisasi, hanya tampilan)
    const name =
      (user.user_metadata?.name as string) ||
      (user.user_metadata?.full_name as string) ||
      user.email.split("@")[0];

    return {
      id: user.id,
      name,
      email: user.email,
      role,
    };
  } catch (error: any) {
    if (error?.digest === "DYNAMIC_SERVER_USAGE" || error?.message?.includes("DYNAMIC_SERVER_USAGE")) {
      throw error;
    }
    console.error("Gagal mendapatkan current user dari Supabase Auth:", error);
    return null;
  }
}

/**
 * Helper untuk memvalidasi otentikasi dan otorisasi role pengguna di Server Actions / Components.
 */
export async function requireUser(allowedRoles?: Role[]): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized. Silakan login terlebih dahulu.");
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw new Error("Forbidden. Anda tidak memiliki akses untuk tindakan ini.");
  }

  return user;
}