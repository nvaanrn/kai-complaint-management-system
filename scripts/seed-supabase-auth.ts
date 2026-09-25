import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";

// Load .env variables via Next.js built-in env loader
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.NEXT_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL atau NEXT_SERVICE_ROLE_KEY belum diatur di .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const defaultUsers = [
  {
    email: "admin@spkp.kai.id",
    name: "Administrator SPKP",
    role: "ADMIN",
    password: "password123",
  },
  {
    email: "pic@spkp.kai.id",
    name: "Budi Santoso (PIC Operasional)",
    role: "PIC",
    password: "password123",
  },
  {
    email: "verifikator@spkp.kai.id",
    name: "Siti Rahma (Tim Verifikasi)",
    role: "VERIFIKATOR",
    password: "password123",
  },
];

async function seedSupabaseAuth() {
  console.log("🚂 Menginisialisasi Akun Standar SPKP KAI di Supabase Auth...\n");

  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("❌ Gagal mengambil daftar pengguna Supabase:", listError.message);
    process.exit(1);
  }

  for (const user of defaultUsers) {
    const existing = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === user.email.toLowerCase()
    );

    if (existing) {
      console.log(`ℹ️  User ${user.email} sudah ada di Supabase Auth. Memperbarui metadata...`);
      const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
        password: user.password,
        user_metadata: { name: user.name, role: user.role },
        app_metadata: { role: user.role },
        email_confirm: true,
      });

      if (updateError) {
        console.warn(`   ⚠️ Gagal memperbarui metadata: ${updateError.message}`);
      } else {
        console.log(`   ✅ Selesai diperbarui (Role: ${user.role})`);
      }
    } else {
      console.log(`➕ Membuat akun baru untuk ${user.email}...`);
      const { error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name, role: user.role },
        app_metadata: { role: user.role },
      });

      if (createError) {
        console.error(`   ❌ Gagal membuat akun: ${createError.message}`);
      } else {
        console.log(`   ✅ Berhasil dibuat (Role: ${user.role})`);
      }
    }
  }

  console.log("\n🎉 Seluruh akun uji coba SPKP telah siap di Supabase Auth!");
  console.log("   Password default untuk semua akun: password123\n");
}

seedSupabaseAuth().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
