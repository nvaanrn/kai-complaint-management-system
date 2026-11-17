import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import * as fs from "fs";
import * as path from "path";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

async function backupDatabase() {
  console.log("💾 Memulai proses pencadangan (backup) data SPKP dari MySQL via Prisma...\n");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  try {
    const users = await prisma.user.findMany();
    const complaints = await prisma.complaint.findMany();
    const verifications = await prisma.verification.findMany();
    const documents = await prisma.document.findMany();

    const backupData = {
      User: users,
      Complaint: complaints,
      Verification: verifications,
      Document: documents,
    };

    // Buat direktori backups jika belum ada
    const backupsDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const filename = `backup_spkp_${timestamp}.json`;
    const filepath = path.join(backupsDir, filename);

    const payload = {
      exportedAt: new Date().toISOString(),
      databaseProvider: "mysql",
      version: "1.0.0",
      data: backupData,
    };

    fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), "utf-8");

    console.log(`\n🎉 Pencadangan selesai dengan sukses!`);
    console.log(`📁 Berkas tersimpan di: ${filepath}`);
    console.log(`📊 Total: ${complaints.length} keluhan, ${users.length} pengguna, ${verifications.length} verifikasi, ${documents.length} dokumen.\n`);
  } catch (err: any) {
    console.error("❌ Gagal melakukan backup database:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabase();
