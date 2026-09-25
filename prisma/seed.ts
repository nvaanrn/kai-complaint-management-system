import { PrismaClient, Role, ComplaintStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Mulai proses seeding database...');

  // Hash password default untuk semua user awal
  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Buat User Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@spkp.kai.id' },
    update: {},
    create: {
      name: 'Administrator SPKP',
      email: 'admin@spkp.kai.id',
      password: defaultPassword,
      role: Role.ADMIN,
    },
  });

  // 2. Buat User PIC (Penanggung Jawab / Penanganan)
  const pic = await prisma.user.upsert({
    where: { email: 'pic@spkp.kai.id' },
    update: {},
    create: {
      name: 'Budi Santoso (PIC Operasional)',
      email: 'pic@spkp.kai.id',
      password: defaultPassword,
      role: Role.PIC,
    },
  });

  // 3. Buat User Verifikator
  const verifikator = await prisma.user.upsert({
    where: { email: 'verifikator@spkp.kai.id' },
    update: {},
    create: {
      name: 'Siti Rahma (Tim Verifikasi)',
      email: 'verifikator@spkp.kai.id',
      password: defaultPassword,
      role: Role.VERIFIKATOR,
    },
  });

  console.log('✅ User berhasil di-seed:');
  console.log(`   - Admin       : ${admin.email}`);
  console.log(`   - PIC         : ${pic.email}`);
  console.log(`   - Verifikator : ${verifikator.email}`);
  console.log('   (Password untuk semua akun: password123)\n');

  // 4. Buat Sample Data Keluhan (Complaints)
  const complaints = [
    {
      complaintNumber: 'CMP-2026-001',
      date: new Date('2026-09-23T08:30:00Z'),
      customerName: 'PT Surya Gemilang',
      source: 'Telepon',
      description: 'Gangguan sinkronisasi data tagihan periode September 2026',
      status: ComplaintStatus.DALAM_PENANGANAN,
      picId: pic.id,
      correctiveAction: 'Pengecekan log API dan sinkronisasi manual database transaksi.',
      notes: 'Sedang dalam penanganan teknis tim IT.',
    },
    {
      complaintNumber: 'CMP-2026-002',
      date: new Date('2026-09-23T10:15:00Z'),
      customerName: 'Bapak Hendra (Divisi Logistik)',
      source: 'Email',
      description: 'Laporan kelambatan pengiriman berkas surat jalan cabang',
      status: ComplaintStatus.BELUM_DITANGANI,
      picId: null,
      correctiveAction: null,
      notes: 'Menunggu penugasan PIC operasional.',
    },
    {
      complaintNumber: 'CMP-2026-003',
      date: new Date('2026-09-22T14:00:00Z'),
      customerName: 'Ibu Ratna (Unit Layanan Terpadu)',
      source: 'Laporan Langsung',
      description: 'Permintaan rekapitulasi berkas tindak lanjut keluhan triwulan III',
      status: ComplaintStatus.MENUNGGU_VERIFIKASI,
      picId: pic.id,
      correctiveAction: 'Penyusunan laporan rekapitulasi data triwulan III selesai dibuat.',
      notes: 'Sudah diajukan ke tim verifikator.',
    },
  ];

  for (const item of complaints) {
    await prisma.complaint.upsert({
      where: { complaintNumber: item.complaintNumber },
      update: {},
      create: item,
    });
  }

  console.log(`✅ ${complaints.length} Data keluhan awal berhasil di-seed.`);
  console.log('🎉 Seeding selesai dengan sukses!');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
