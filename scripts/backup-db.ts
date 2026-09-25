import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import * as fs from "fs";
import * as path from "path";

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.NEXT_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL atau NEXT_SERVICE_ROLE_KEY belum diatur di .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function backupDatabase() {
  console.log("💾 Memulai proses pencadangan (backup) data SPKP dari Supabase...\n");

  const tables = ["User", "Complaint", "Verification", "Document"];
  const backupData: Record<string, any[]> = {};
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  for (const table of tables) {
    console.log(`⏳ Mengambil data dari tabel ${table}...`);
    const { data, error } = await supabase.from(table).select("*");

    if (error) {
      console.warn(`   ⚠️ Peringatan saat mengambil tabel ${table}:`, error.message);
      backupData[table] = [];
    } else {
      backupData[table] = data || [];
      console.log(`   ✅ Berhasil mencadangkan ${backupData[table].length} rekaman dari ${table}`);
    }
  }

  // Buat direktori backups jika belum ada
  const backupsDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const filename = `backup_spkp_${timestamp}.json`;
  const filepath = path.join(backupsDir, filename);

  const payload = {
    exportedAt: new Date().toISOString(),
    projectUrl: supabaseUrl,
    version: "1.0.0",
    data: backupData,
  };

  fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), "utf-8");

  console.log(`\n🎉 Pencadangan selesai dengan sukses!`);
  console.log(`📁 Berkas tersimpan di: ${filepath}`);
  console.log(`📊 Total: ${backupData.Complaint.length} keluhan, ${backupData.User.length} pengguna, ${backupData.Verification.length} verifikasi.\n`);
}

backupDatabase().catch((err) => {
  console.error("❌ Gagal mencadangkan database:", err);
  process.exit(1);
});
