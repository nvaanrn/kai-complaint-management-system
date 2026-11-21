import { PrismaClient, Role, ComplaintStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Mulai proses seeding database...');

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Buat User Admin
  const admin = await prisma.user.upsert({
    where: { nipp: '9987459001' },
    update: {},
    create: { nipp: '9987459001', name: 'Administrator SPKP', password: defaultPassword, role: Role.ADMIN },
  });

  // 2. Buat User PIC
  const pic = await prisma.user.upsert({
    where: { nipp: '9987459002' },
    update: {},
    create: { nipp: '9987459002', name: 'Budi Santoso (PIC Operasional)', password: defaultPassword, role: Role.PIC },
  });

  // 3. Buat User Verifikator
  const verifier = await prisma.user.upsert({
    where: { nipp: '9987459003' },
    update: {},
    create: { nipp: '9987459003', name: 'Siti Rahma (Tim Verifikasi)', password: defaultPassword, role: Role.VERIFIKATOR },
  });

  console.log('✅ Users ter‑seed', { admin: admin.nipp, pic: pic.nipp, verifier: verifier.nipp });

  // 4. Seed master category (default)
  const defaultCategory = await prisma.complaintCategoryMaster.upsert({
    where: { name: 'Umum / Belum Dikategorikan' },
    update: {},
    create: { name: 'Umum / Belum Dikategorikan', slaHours: 24, isActive: true },
  });

  // 5. Sample complaints (harus menyertakan categoryId)
  const complaints = [
    {
      complaintNumber: 'CMP-2026-001',
      date: new Date('2026-09-23T08:30:00Z'),
      customerName: 'PT Surya Gemilang',
      source: 'Contact Center 121',
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
      source: 'Email Resmi KAI',
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
      source: 'Petugas Stasiun / Loket',
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
      update: { source: item.source },
      create: { ...item, categoryId: defaultCategory.id },
    });
  }

  // 6. Sinkronisasi Counter
  await prisma.complaintCounter.upsert({
    where: { year: 2026 },
    update: { lastSequence: complaints.length },
    create: { year: 2026, lastSequence: complaints.length },
  });

  console.log(`✅ ${complaints.length} complaints ter‑seed, counter sync selesai.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });