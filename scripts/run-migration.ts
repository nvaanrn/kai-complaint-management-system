import { loadEnvConfig } from "@next/env";
import { spawnSync } from "child_process";

loadEnvConfig(process.cwd());

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("❌ DIRECT_URL atau DATABASE_URL tidak ditemukan di environment (.env)");
  process.exit(1);
}

console.log("🚀 Menjalankan migrasi Supabase CLI dengan direct connection...");

// Jalankan supabase db push dengan --db-url
const result = spawnSync("npx", ["supabase", "db", "push", "--db-url", dbUrl, "--include-all"], {
  stdio: "inherit",
  shell: true,
});

if (result.status === 0) {
  console.log("✅ Migrasi Supabase CLI berhasil dijalankan!");
} else {
  console.error("❌ Migrasi Supabase CLI gagal dengan exit code:", result.status);
  process.exit(result.status ?? 1);
}
