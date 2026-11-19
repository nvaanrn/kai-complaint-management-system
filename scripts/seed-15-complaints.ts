import { PrismaClient, ComplaintStatus, ComplaintCategory, VerificationResult } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Memulai penambahan 15 data keluhan uji coba SPKP...');

  // 1. Ambil user PIC dan Verifikator yang sudah ada
  const pic = await prisma.user.findFirst({
    where: { role: 'PIC' },
  });
  const verifikator = await prisma.user.findFirst({
    where: { role: 'VERIFIKATOR' },
  });
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!pic || !verifikator || !admin) {
    throw new Error('User PIC, Verifikator, atau Admin tidak ditemukan di database.');
  }

  console.log(`Menggunakan PIC: ${pic.name} (${pic.id})`);
  console.log(`Menggunakan Verifikator: ${verifikator.name} (${verifikator.id})`);

  // 2. Data 15 keluhan
  const newComplaints = [
    // --- 5 DALAM_PENANGANAN ---
    {
      complaintNumber: 'CMP-2026-005',
      date: new Date('2026-10-27T08:00:00Z'),
      customerName: 'Agus Pratama',
      customerContact: '081234567890',
      daopOrStation: 'Daop 1 Jakarta',
      source: 'Aplikasi Access by KAI',
      category: ComplaintCategory.FASILITAS_KERETA,
      description: 'Pendingin ruangan (AC) di gerbong Eksekutif 2 KA Argo Parahyangan kurang dingin selama perjalanan Jakarta-Bandung.',
      status: ComplaintStatus.DALAM_PENANGANAN,
      picId: pic.id,
      assignedAt: new Date('2026-10-27T08:15:00Z'),
      correctiveAction: 'Teknisi KA sedang memeriksa unit kompresor AC dan filter pendingin pada rangkaian saat depo transit.',
      preventiveAction: 'Akan dilakukan pengecekan tekanan freon berkala setiap sebelum rangkaian diberangkatkan.',
      submissionCount: 0,
      notes: 'Sedang dalam penanganan teknisi sarana depo Bandung.',
    },
    {
      complaintNumber: 'CMP-2026-006',
      date: new Date('2026-10-27T09:30:00Z'),
      customerName: 'Dewi Lestari',
      customerContact: '081398765432',
      daopOrStation: 'Daop 6 Yogyakarta',
      source: 'Petugas Stasiun / Loket',
      category: ComplaintCategory.FASILITAS_STASIUN,
      description: 'Eskalator peron 3 Stasiun Tugu Yogyakarta mengalami gangguan mati mendadak saat jam sibuk kedatangan KA.',
      status: ComplaintStatus.DALAM_PENANGANAN,
      picId: pic.id,
      assignedAt: new Date('2026-10-27T09:45:00Z'),
      correctiveAction: 'Petugas fasilitas stasiun telah memasang safety line dan memanggil vendor pemeliharaan eskalator.',
      preventiveAction: 'Penjadwalan uji beban mekanis rutin mingguan untuk seluruh eskalator stasiun.',
      submissionCount: 0,
      notes: 'Menunggu penggantian spare part inverter eskalator.',
    },
    {
      complaintNumber: 'CMP-2026-007',
      date: new Date('2026-10-27T11:00:00Z'),
      customerName: 'Rian Hidayat',
      customerContact: '085712348901',
      daopOrStation: 'Daop 4 Semarang',
      source: 'Contact Center 121',
      category: ComplaintCategory.TIKET_DAN_SISTEM,
      description: 'Gagal cetak e-boarding pass di boarding gate Stasiun Semarang Tawang karena barcode tidak terbaca scanner.',
      status: ComplaintStatus.DALAM_PENANGANAN,
      picId: pic.id,
      assignedAt: new Date('2026-10-27T11:20:00Z'),
      correctiveAction: 'Pembersihan lensa optical scanner boarding gate dan penyesuaian kontras layar pembaca.',
      preventiveAction: 'Pemeriksaan dan kalibrasi perangkat scanner secara berkala setiap pergantian shift boarding.',
      submissionCount: 0,
      notes: 'Unit IT stasiun sedang melakukan kalibrasi hardware scanner.',
    },
    {
      complaintNumber: 'CMP-2026-008',
      date: new Date('2026-10-27T14:15:00Z'),
      customerName: 'Siti Nurhaliza',
      customerContact: '087823456789',
      daopOrStation: 'Daop 2 Bandung',
      source: 'Media Sosial (Twitter/X, IG)',
      category: ComplaintCategory.PELAYANAN_PETUGAS,
      description: 'Keluhan mengenai informasi keterlambatan KA Malabar di Stasiun Cimahi yang terlambat diumumkan petugas informasi.',
      status: ComplaintStatus.DALAM_PENANGANAN,
      picId: pic.id,
      assignedAt: new Date('2026-10-27T14:30:00Z'),
      correctiveAction: 'Pemberian arahan kepada petugas announcer stasiun terkait kepatuhan SOP update broadcast keterlambatan tiap 10 menit.',
      preventiveAction: 'Integrasi sistem display informasi stasiun dengan radar monitoring posisi rangkaian otomatis.',
      submissionCount: 0,
      notes: 'Dalam koordinasi dengan Kepala Stasiun Cimahi.',
    },
    {
      complaintNumber: 'CMP-2026-009',
      date: new Date('2026-10-27T16:00:00Z'),
      customerName: 'Bambang Sudarmono',
      customerContact: '081122334455',
      daopOrStation: 'Daop 8 Surabaya',
      source: 'Email Resmi KAI',
      category: ComplaintCategory.REFUND_DAN_TARIF,
      description: 'Klaim pengembalian bea pembatalan tiket KA Argo Bromo Anggrek belum masuk rekening setelah 7 hari kerja.',
      status: ComplaintStatus.DALAM_PENANGANAN,
      picId: pic.id,
      assignedAt: new Date('2026-10-27T16:15:00Z'),
      correctiveAction: 'Koordinasi dengan divisi keuangan dan payment gateway untuk pengecekan status settlement transaksi.',
      preventiveAction: 'Monitoring harian queue transaksi refund yang mengalami reject dari bank penerima.',
      submissionCount: 0,
      notes: 'Menunggu konfirmasi settlement dari pihak bank.',
    },

    // --- 5 MENUNGGU_VERIFIKASI ---
    {
      complaintNumber: 'CMP-2026-010',
      date: new Date('2026-10-28T08:00:00Z'),
      customerName: 'Farhan Mahendra',
      customerContact: '081298123456',
      daopOrStation: 'Daop 1 Jakarta',
      source: 'Aplikasi Access by KAI',
      category: ComplaintCategory.KESELAMATAN_KEAMANAN,
      description: 'Tas ransel tertinggal di rak bagasi atas gerbong Bisnis 1 KA Taksaka saat turun di Stasiun Gambir.',
      status: ComplaintStatus.MENUNGGU_VERIFIKASI,
      picId: pic.id,
      assignedAt: new Date('2026-10-28T08:15:00Z'),
      submittedAt: new Date('2026-10-28T09:00:00Z'),
      correctiveAction: 'Petugas PAM dan Polsuska menyisir rangkaian, barang ditemukan lengkap dan diamankan di pos Lost and Found Stasiun Gambir.',
      preventiveAction: 'Pengetatan SOP sweeping gerbong oleh kondektur dan Polsuska sebelum rangkaian masuk stabling depo.',
      submissionCount: 1,
      notes: 'Barang telah siap diserahkan kembali kepada pemilik.',
    },
    {
      complaintNumber: 'CMP-2026-011',
      date: new Date('2026-10-28T09:00:00Z'),
      customerName: 'Anisa Rahmawati',
      customerContact: '082134567891',
      daopOrStation: 'Daop 5 Purwokerto',
      source: 'Contact Center 121',
      category: ComplaintCategory.FASILITAS_KERETA,
      description: 'Stopkontak charger ponsel di kursi 12A-12B KA Sawunggalih padam tidak mengeluarkan daya.',
      status: ComplaintStatus.MENUNGGU_VERIFIKASI,
      picId: pic.id,
      assignedAt: new Date('2026-10-28T09:15:00Z'),
      submittedAt: new Date('2026-10-28T10:30:00Z'),
      correctiveAction: 'Penggantian modul inverter kelistrikan stopkontak dan pengujian voltase 220V dengan voltmeter oleh teknisi KA.',
      preventiveAction: 'Pengecekan kontinuitas seluruh stopkontak tiap gerbong sebelum izin jalan diterbitkan.',
      submissionCount: 1,
      notes: 'Tegangan terukur 220V stabil setelah penggantian komponen.',
    },
    {
      complaintNumber: 'CMP-2026-012',
      date: new Date('2026-10-28T10:00:00Z'),
      customerName: 'Dian Kusuma',
      customerContact: '083812345670',
      daopOrStation: 'Daop 7 Madiun',
      source: 'Petugas Stasiun / Loket',
      category: ComplaintCategory.FASILITAS_STASIUN,
      description: 'Toilet ruang tunggu timur Stasiun Madiun air keran mengalir sangat kecil dan wastafel tersumbat.',
      status: ComplaintStatus.MENUNGGU_VERIFIKASI,
      picId: pic.id,
      assignedAt: new Date('2026-10-28T10:15:00Z'),
      submittedAt: new Date('2026-10-28T11:45:00Z'),
      correctiveAction: 'Pembersihan pipa saluran pembuangan wastafel dan pembersihan saringan pompa tandon air utama.',
      preventiveAction: 'Pemeriksaan debit air dan kebersihan fasilitas sanitasi stasiun setiap 2 jam oleh petugas kebersihan.',
      submissionCount: 1,
      notes: 'Aliran air sudah deras dan wastafel lancar.',
    },
    {
      complaintNumber: 'CMP-2026-013',
      date: new Date('2026-10-28T11:30:00Z'),
      customerName: 'Eko Prasetyo',
      customerContact: '085298761234',
      daopOrStation: 'Daop 3 Cirebon',
      source: 'Aplikasi Access by KAI',
      category: ComplaintCategory.TIKET_DAN_SISTEM,
      description: 'Saldo KAI Pay terpotong ganda saat pemesanan tiket promo KA Ranggajati.',
      status: ComplaintStatus.MENUNGGU_VERIFIKASI,
      picId: pic.id,
      assignedAt: new Date('2026-10-28T11:45:00Z'),
      submittedAt: new Date('2026-10-28T13:15:00Z'),
      correctiveAction: 'Melakukan rekonsiliasi log transaksi KAI Pay dan pengembalian saldo terpotong ganda sebesar Rp 210.000 ke akun pengguna.',
      preventiveAction: 'Implementasi idempotency key pada modul payment processing Access by KAI guna mencegah duplikasi transaksi.',
      submissionCount: 1,
      notes: 'Saldo sudah dikreditkan kembali ke akun pelapor.',
    },
    {
      complaintNumber: 'CMP-2026-014',
      date: new Date('2026-10-28T13:00:00Z'),
      customerName: 'Laras Wulandari',
      customerContact: '081987654321',
      daopOrStation: 'Daop 6 Yogyakarta',
      source: 'Media Sosial (Twitter/X, IG)',
      category: ComplaintCategory.PELAYANAN_PETUGAS,
      description: 'Keluhan menu makanan prasmanan restorasi KA Lodaya yang habis saat perjalanan baru mencapai Stasiun Kroya.',
      status: ComplaintStatus.MENUNGGU_VERIFIKASI,
      picId: pic.id,
      assignedAt: new Date('2026-10-28T13:15:00Z'),
      submittedAt: new Date('2026-10-28T14:30:00Z'),
      correctiveAction: 'Koordinasi dengan KAI Services untuk penambahan kuota suplai makanan siap saji pada titik restock Stasiun Kutoarjo.',
      preventiveAction: 'Penyesuaian estimasi katering berbasis okupansi penumpang per perjalanan KA secara realtime.',
      submissionCount: 1,
      notes: 'Telah diajukan permohonan verifikasi ke verifikator.',
    },

    // --- 5 TERVERIFIKASI ---
    {
      complaintNumber: 'CMP-2026-015',
      date: new Date('2026-10-26T09:00:00Z'),
      customerName: 'Hendra Wijaya',
      customerContact: '081211223344',
      daopOrStation: 'Daop 1 Jakarta',
      source: 'Contact Center 121',
      category: ComplaintCategory.FASILITAS_KERETA,
      description: 'Pintu otomatis antar gerbong KA Argo Cheribon macet dan tidak dapat menutup rapat.',
      status: ComplaintStatus.TERVERIFIKASI,
      picId: pic.id,
      assignedAt: new Date('2026-10-26T09:15:00Z'),
      submittedAt: new Date('2026-10-26T11:00:00Z'),
      completedAt: new Date('2026-10-26T14:00:00Z'),
      correctiveAction: 'Penyetelan sensor optik dan pelumasan rel jalur pintu geser otomatis oleh teknisi kereta api.',
      preventiveAction: 'Pengecekan mekanikal pintu gerbong dalam checklist harian pemeliharaan sarana di depo.',
      submissionCount: 1,
      notes: 'Pintu sudah berfungsi otomatis dengan lancar.',
      verification: {
        feedback: 'Tindakan perbaikan pintu otomatis telah diperiksa dan berfungsi normal. Laporan disetujui.',
        result: VerificationResult.APPROVED,
        verifiedAt: new Date('2026-10-26T14:00:00Z'),
      },
    },
    {
      complaintNumber: 'CMP-2026-016',
      date: new Date('2026-10-26T13:00:00Z'),
      customerName: 'Rina Marlina',
      customerContact: '087755667788',
      daopOrStation: 'Daop 2 Bandung',
      source: 'Petugas Stasiun / Loket',
      category: ComplaintCategory.FASILITAS_STASIUN,
      description: 'Lampu penerangan di area parkir utara Stasiun Bandung padam sehingga gelap saat malam hari.',
      status: ComplaintStatus.TERVERIFIKASI,
      picId: pic.id,
      assignedAt: new Date('2026-10-26T13:30:00Z'),
      submittedAt: new Date('2026-10-26T15:30:00Z'),
      completedAt: new Date('2026-10-26T17:30:00Z'),
      correctiveAction: 'Penggantian 4 unit lampu floodlight LED 100W dan perbaikan sakelar MCB instalasi penerangan parkir.',
      preventiveAction: 'Penggantian berkala lampu sorot outdoor dengan spesifikasi IP65 tahan cuaca dan inspeksi berkala.',
      submissionCount: 1,
      notes: 'Penerangan parkir utara telah normal dan terang.',
      verification: {
        feedback: 'Area parkir utara telah terang kembali, dokumentasi fisik instalasi telah diverifikasi.',
        result: VerificationResult.APPROVED,
        verifiedAt: new Date('2026-10-26T17:30:00Z'),
      },
    },
    {
      complaintNumber: 'CMP-2026-017',
      date: new Date('2026-10-27T08:00:00Z'),
      customerName: 'Wahyu Setiawan',
      customerContact: '081344556677',
      daopOrStation: 'Daop 8 Surabaya',
      source: 'Aplikasi Access by KAI',
      category: ComplaintCategory.TIKET_DAN_SISTEM,
      description: 'Nama penumpang pada tiket elektronik salah satu huruf dan penumpang khawatir tidak diizinkan boarding.',
      status: ComplaintStatus.TERVERIFIKASI,
      picId: pic.id,
      assignedAt: new Date('2026-10-27T08:15:00Z'),
      submittedAt: new Date('2026-10-27T09:30:00Z'),
      completedAt: new Date('2026-10-27T11:00:00Z'),
      correctiveAction: 'Customer Service Stasiun Surabaya Gubeng telah menerbitkan surat koreksi identitas dan penyesuaian manifes boarding.',
      preventiveAction: 'Sosialisasi fitur koreksi mandiri identitas di aplikasi Access sebelum waktu keberangkatan.',
      submissionCount: 1,
      notes: 'Penumpang berhasil boarding KA Sancaka tanpa kendala.',
      verification: {
        feedback: 'Prosedur koreksi manifes sesuai dengan aturan SK Direksi Pelayanan KAI.',
        result: VerificationResult.APPROVED,
        verifiedAt: new Date('2026-10-27T11:00:00Z'),
      },
    },
    {
      complaintNumber: 'CMP-2026-018',
      date: new Date('2026-10-27T12:00:00Z'),
      customerName: 'Kartika Sari',
      customerContact: '085612349876',
      daopOrStation: 'Daop 4 Semarang',
      source: 'Petugas Stasiun / Loket',
      category: ComplaintCategory.KESELAMATAN_KEAMANAN,
      description: 'Ada genangan air licin di koridor peron 1 Stasiun Poncol akibat rembesan talang air saat hujan deras.',
      status: ComplaintStatus.TERVERIFIKASI,
      picId: pic.id,
      assignedAt: new Date('2026-10-27T12:15:00Z'),
      submittedAt: new Date('2026-10-27T14:00:00Z'),
      completedAt: new Date('2026-10-27T15:45:00Z'),
      correctiveAction: 'Penyedotan genangan, pemasangan tanda peringatan lantai licin, dan penambalan seal talang atap peron.',
      preventiveAction: 'Pengecekan talang dan saluran drainase atap seluruh stasiun menjelang musim penghujan.',
      submissionCount: 1,
      notes: 'Area peron 1 sudah kering dan talang atap tertutup rapat.',
      verification: {
        feedback: 'Talang atap telah diperbaiki dan lantai peron sudah kering serta aman untuk mobilitas penumpang.',
        result: VerificationResult.APPROVED,
        verifiedAt: new Date('2026-10-27T15:45:00Z'),
      },
    },
    {
      complaintNumber: 'CMP-2026-019',
      date: new Date('2026-10-28T07:00:00Z'),
      customerName: 'Bagus Wicaksono',
      customerContact: '081299887766',
      daopOrStation: 'Divre I Sumatera Utara',
      source: 'Email Resmi KAI',
      category: ComplaintCategory.INFORMASI_DAN_LAINNYA,
      description: 'Permintaan jadwal komuter KA Sri Lelawangsa terbaru dan kepastian integrasi transit dengan Bus Trans Medan.',
      status: ComplaintStatus.TERVERIFIKASI,
      picId: pic.id,
      assignedAt: new Date('2026-10-28T07:15:00Z'),
      submittedAt: new Date('2026-10-28T08:30:00Z'),
      completedAt: new Date('2026-10-28T09:15:00Z'),
      correctiveAction: 'Pengiriman buklet jadwal operasional KA resmi melalui email serta posting info infografis di media sosial resmi Divre I.',
      preventiveAction: 'Penyediaan leaflet jadwal fisik di setiap halte transit stasiun dan pengkinian berkala data jadwal terpadu.',
      submissionCount: 1,
      notes: 'Email balasan telah diterima dan dibaca oleh pelapor.',
      verification: {
        feedback: 'Informasi jadwal dan integrasi telah disampaikan secara lengkap ke pelapor.',
        result: VerificationResult.APPROVED,
        verifiedAt: new Date('2026-10-28T09:15:00Z'),
      },
    },
  ];

  for (const item of newComplaints) {
    const { verification, ...complaintData } = item;

    const upserted = await prisma.complaint.upsert({
      where: { complaintNumber: complaintData.complaintNumber },
      update: complaintData,
      create: complaintData,
    });

    if (verification) {
      // Hapus verifikasi lama jika ada agar tidak dobel
      await prisma.verification.deleteMany({
        where: { complaintId: upserted.id },
      });

      await prisma.verification.create({
        data: {
          complaintId: upserted.id,
          verifierId: verifikator.id,
          result: verification.result,
          feedback: verification.feedback,
          cycle: 1,
          verifiedAt: verification.verifiedAt,
        },
      });
    }

    console.log(`✅ [${upserted.status}] ${upserted.complaintNumber} - ${upserted.customerName}`);
  }

  // 3. Update ComplaintCounter ke 19
  await prisma.complaintCounter.upsert({
    where: { year: 2026 },
    update: { lastSequence: 19 },
    create: { year: 2026, lastSequence: 19 },
  });

  console.log('\n🎉 Berhasil menambahkan 15 data keluhan!');
  console.log('✅ ComplaintCounter tahun 2026 telah diperbarui ke nomor urut 19.');
}

main()
  .catch((e) => {
    console.error('❌ Gagal menambahkan data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

