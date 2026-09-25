"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Role } from "@/types/database";
import { revalidatePath } from "next/cache";

export interface LoginResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action: Login dengan Supabase Auth (@supabase/ssr)
 * Mengatur cookie sesi secara aman di server.
 * Mendukung auto-provisioning untuk akun resmi/pengujian KAI jika belum dibuat di Supabase Auth.
 */
export async function loginWithSupabase(formData: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  const email = formData.email.trim();
  const password = formData.password.trim();

  if (!email || !password) {
    return { success: false, error: "Email dan kata sandi wajib diisi." };
  }

  const supabase = await createServerSupabaseClient();

  // 1. Coba login dengan kredensial yang diberikan
  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // 2. Jika akun belum terdaftar dan service role key tersedia, lakukan auto-provisioning untuk akun KAI
  if (error && process.env.NEXT_SERVICE_ROLE_KEY) {
    const isKaiInternalAccount =
      email === "admin@spkp.kai.id" ||
      email === "pic@spkp.kai.id" ||
      email === "verifikator@spkp.kai.id";

    if (isKaiInternalAccount && password === "password123") {
      try {
        // Mapping eksplisit email → role (tidak pakai string matching)
        const roleByEmail: Record<string, { role: Role; name: string }> = {
          "admin@spkp.kai.id": { role: Role.ADMIN, name: "Administrator SPKP" },
          "pic@spkp.kai.id": { role: Role.PIC, name: "Budi Santoso (PIC Operasional)" },
          "verifikator@spkp.kai.id": { role: Role.VERIFIKATOR, name: "Siti Rahma (Tim Verifikasi)" },
        };
        const { role: targetRole, name: targetName } = roleByEmail[email];

        // Buat akun langsung di Supabase Auth dengan app_metadata.role (standar Supabase)
        await adminSupabase.auth.admin.createUser({
          email,
          password: "password123",
          email_confirm: true,
          user_metadata: { name: targetName },
          app_metadata: { role: targetRole }, // ✅ role di app_metadata, bukan user_metadata
        });

        // Coba login kembali setelah akun berhasil dibuat
        const retry = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!retry.error) {
          revalidatePath("/dashboard");
          return { success: true };
        }
      } catch (provisionErr: any) {
        console.warn("Gagal auto-provisioning akun Supabase Auth:", provisionErr?.message || provisionErr);
      }
    }
  }

  if (error) {
    return {
      success: false,
      error:
        error.message === "Invalid login credentials"
          ? "Email atau kata sandi tidak sesuai. Silakan periksa kembali."
          : error.message,
    };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Server Action: Logout pengguna dari sesi Supabase Auth
 */
export async function logoutWithSupabase(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath("/");
}
