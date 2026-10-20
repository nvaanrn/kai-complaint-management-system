# Roadmap & Checklist Pengembangan SPKP

> **Daftar Tugas dan Rencana Pengembangan Sistem Penanganan Keluhan Pelanggan**  
> **PT Kereta Api Indonesia (Persero)**

---

## 🏁 Fase 1: Fondasi Arsitektur & Autentikasi (Selesai ✅)

- [x] **Inisialisasi Proyek & Tech Stack:**
  - [x] Setup Next.js 14 App Router, React 18, Tailwind CSS, TypeScript.
  - [x] Setup Prisma ORM v5 dengan koneksi PostgreSQL Supabase Cloud.
  - [x] Integrasi Agent Skills resmi (`supabase`, `supabase-postgres-best-practices`, `vercel-react-best-practices`, `prisma-client-api`).
- [x] **Setup Supabase CLI & Migrasi Skema:**
  - [x] Instalasi `supabase` CLI dan inisialisasi direktori `supabase/`.
  - [x] Pembuatan berkas migrasi baseline: [supabase/migrations/20260925132048_initial_schema.sql](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/supabase/migrations/20260925132048_initial_schema.sql).
  - [x] Pembuatan indeks performa pada seluruh kolom Foreign Key.
  - [x] Pengaktifan Row Level Security (RLS) di seluruh tabel public.
- [x] **Autentikasi Standar Supabase (@supabase/ssr):**
  - [x] Pembuatan modul modular Supabase client:
    - [src/lib/supabase/client.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/lib/supabase/client.ts) (Browser)
    - [src/lib/supabase/server.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/lib/supabase/server.ts) (Server SSR)
    - [src/lib/supabase/admin.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/lib/supabase/admin.ts) (Admin Service Role)
  - [x] Implementasi Middleware proteksi sesi dan refresh token di [src/middleware.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/middleware.ts).
  - [x] Pembaruan halaman login [src/app/login/page.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/app/login/page.tsx) dengan `supabase.auth.signInWithPassword`.
  - [x] Tombol logout [src/components/LogoutButton.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/LogoutButton.tsx) dengan `supabase.auth.signOut`.
  - [x] Pembersihan dependensi lawas NextAuth.
  - [x] Penyediaan akun pengujian awal di Supabase Auth (`admin@spkp.kai.id`, `pic@spkp.kai.id`, `verifikator@spkp.kai.id`).
- [x] **Alur Kerja Tiga Peran (*Three-Tier Roles*):**
  - [x] Admin CS: Form pencatatan keluhan baru & penugasan PIC.
  - [x] PIC: Form input tindakan korektif, tindakan preventif, & submit verifikasi.
  - [x] Verifikator: Aksi setujui/tolak dengan catatan evaluasi wajib jika ditolak.
- [x] **Prototipe Ekspor Dokumen:**
  - [x] Komponen [src/components/KaiDocumentModal.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/KaiDocumentModal.tsx) dengan format tabel resmi `FR.SM/TI/033.001`.
  - [x] Cetak / Save as PDF via `window.print()` dan stylesheet `@media print`.

---

## 🚀 Fase 2: Ekspor PDF React-PDF & Penegasan Peran (Selesai ✅)

- [x] **Ekspor PDF Langsung dengan `@react-pdf/renderer`:**
  - [x] Instalasi pustaka `@react-pdf/renderer` (v4.3.2).
  - [x] Pembuatan komponen dokumen PDF: [src/components/pdf/KaiDocumentPdf.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/pdf/KaiDocumentPdf.tsx) (A4 Landscape, tabel rekapitulasi presisi, kop KAI, nomor formulir `FR.SM/TI/033.001`, dan blok tanda tangan MR & Pelaksana).
  - [x] Integrasi tombol unduh langsung di [src/components/KaiDocumentModal.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/KaiDocumentModal.tsx) via `toBlob()` tanpa dialog print browser.
  - [x] Penyimpanan batch dokumen ke tabel `Document`.
- [x] **Visibilitas Sistem & Pembatasan Eksekusi PIC:**
  - [x] PIC dapat melihat seluruh keluhan yang ada di dalam sistem (default `picOnlyFilter: false`).
  - [x] Filter cepat toggle "Tugas Saya" vs "Semua Keluhan" di toolbar dashboard.
  - [x] Pembatasan hak eksekusi ketat: PIC **hanya dapat mengeksekusi & mengisi tindakan** pada keluhan yang ditugaskan resmi kepada akun dirinya.
  - [x] Banner informatif dan mode *read-only* jika PIC membuka keluhan yang ditugaskan kepada personil lain.
  - [x] Penolakan mutasi di Server Action [src/app/actions/complaints.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/app/actions/complaints.ts) jika `existingComplaint.picId !== user.id`.
- [x] **Kewenangan Penugasan Mutlak oleh Admin:**
  - [x] Dropdown pemilihan & penggantian PIC hanya dapat diakses oleh Admin.
  - [x] Server Action `assignPIC` menolak request selain role `ADMIN`.
- [x] **Penyimpanan Foto Bukti Hasil Perbaikan ke Supabase Storage:**
  - [x] Pembuatan public bucket `complaint-proofs` di Supabase Storage (5MB limit, PNG/JPG/WEBP).
  - [x] Penambahan kolom `proofImageUrl` pada model Prisma `Complaint` dan migrasi database [supabase/migrations/20260925140152_add_proof_image_url.sql](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/supabase/migrations/20260925140152_add_proof_image_url.sql).
  - [x] Komponen upload file & pratinjau thumbnail foto bukti di modal eksekusi PIC.
  - [x] Validasi wajib upload foto bukti sebelum keluhan dapat disubmit untuk verifikasi.
  - [x] Tampilan foto bukti hasil perbaikan di panel keputusan Verifikator dan modal detail keluhan.

---

## 📈 Fase 3: Fitur Pendukung & Optimasi Operasional (Selesai ✅)

- [x] **Indikator SLA & Target Waktu Penanganan:**
  - [x] Tambahkan timestamp `submittedAt` (kapan PIC mengajukan verifikasi) pada model Prisma & database Supabase.
  - [x] Badge audit SLA otomatis (target penyelesaian penanganan 24 jam) di tabel keluhan, header status, dan modal detail:
    - `✓ SLA OK (X jam)` jika diselesaikan dalam batas 24 jam.
    - `⚠️ Lewat SLA (+X jam)` jika melebihi batas 24 jam.
    - `⏱️ Sisa X jam` atau `🚨 Overdue` jika keluhan masih dalam proses penanganan.
- [x] **Penyempurnaan Form Input Keluhan:**
  - [x] Penambahan field `customerContact` (Nomor Telepon / WhatsApp Pelapor) dengan tombol aksi cepat *"💬 Chat WA"* di modal detail keluhan.
  - [x] Penambahan dropdown standardisasi wilayah operasional `daopOrStation` (Kantor Pusat, Daop 1 s.d. Daop 9, Divre I s.d. Divre IV).
  - [x] Dukungan edit kontak & Daop oleh Admin pada modal detail keluhan.
- [x] **Ekspor Tambahan Spreadsheet Excel (`.xlsx`):**
  - [x] Instalasi pustaka `xlsx` (SheetJS).
  - [x] Pembuatan generator ekspor [src/lib/exportExcel.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/lib/exportExcel.ts) dengan layout kolom terstruktur, audit SLA, dan auto-column width.
  - [x] Tombol *"Ekspor Excel (.xlsx)"* di toolbar dashboard dan navigasi sidebar.
  - [x] Integrasi wilayah Daop ke dalam dokumen cetak resmi PDF `FR.SM/TI/033.001`.

- [x] **Migrasi Penuh ke Supabase Client (Zero Prisma Dependency):**
  - [x] Migrasi seluruh Server Actions ([src/app/actions/complaints.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/app/actions/complaints.ts)) dari Prisma ke `supabase.from(...)` (CRUD Complaints, Verifications, Documents, dan numbering sequence).
  - [x] Migrasi [src/app/dashboard/page.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/app/dashboard/page.tsx) ke Supabase Client dengan relasi PIC dan Verifikasi.
  - [x] Pembuatan tipe data dan enum native TypeScript ([src/types/database.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/types/database.ts)) tanpa dependensi `@prisma/client`.
  - [x] Penghapusan kebutuhan `DATABASE_URL` di `.env` (seluruh komunikasi database berjalan via HTTPS REST API Supabase).
- [x] **Perbaikan UX Modal & Validasi:**
  - [x] Isolasi scroll modal form registrasi dengan scroll lock pada `document.body` dan pembagian fixed header, scrollable body (`overflow-y-auto`), serta pinned footer.
  - [x] Validasi ketat wajib diisi (*required*) pada field Uraian Lengkap Keluhan (di sisi UI, disable button, client validation, dan server action).
  - [x] Resilient schema fallback pada [src/app/actions/complaints.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/app/actions/complaints.ts) untuk menangani ketidaksesuaian schema cache PostgREST tanpa memutus alur pengguna.
- [x] **Unit Testing Komprehensif (Vitest):**
  - [x] Setup Vitest (`vitest.config.mts`) dengan path alias `@/*`.
  - [x] Suite Validasi Form: [tests/validation.test.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/tests/validation.test.ts) (13 tests) menguji kewajiban nama pelapor, uraian keluhan, kelengkapan tindakan korektif & preventif PIC, dan catatan revisi verifikator.
  - [x] Suite Perhitungan Audit SLA: [tests/sla.test.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/tests/sla.test.ts) (4 tests) menguji target SLA 24 jam, status aktif, overdue, dan ketepatan waktu.
  - [x] Suite Hak Akses & Kewenangan (RBAC): [tests/auth_rbac.test.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/tests/auth_rbac.test.ts) (14 tests) menguji matriks kewenangan Admin, PIC, dan Verifikator.
  - [x] Suite Penomoran Keluhan: [tests/complaintNumber.test.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/tests/complaintNumber.test.ts) (5 tests) menguji format `CMP-YYYY-XXX` dan sequence increment.

---

## 🔒 Fase 4: Database Hardening & Deployment

- [x] **Eksekusi Migrasi Supabase CLI:**
  - [x] Tautkan project Supabase CLI ke remote project `alxqetorhdynwmkcuyjj` (`supabase link`).
  - [x] Eksekusi seluruh berkas migrasi ke database Supabase Cloud (`supabase db push`):
    - [20260925132048_initial_schema.sql](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/supabase/migrations/20260925132048_initial_schema.sql) (Baseline schema, ENUMs, tabel User, Document, Complaint, Verification, FK, index, dan default RLS).
    - [20260925140152_add_proof_image_url.sql](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/supabase/migrations/20260925140152_add_proof_image_url.sql) (Kolom `proofImageUrl`).
    - [20260925142500_add_sla_and_contact_fields.sql](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/supabase/migrations/20260925142500_add_sla_and_contact_fields.sql) (Kolom `customerContact`, `daopOrStation`, `submittedAt`).
- [x] **Pengetatan Row Level Security (RLS) di Supabase:**
  - [x] Buat helper function `auth.get_role()` berbasis `auth.jwt() -> 'app_metadata' -> 'role'` (SECURITY INVOKER, tidak expose ke public).
  - [x] Buat RLS policy granular per operasi (INSERT/UPDATE/DELETE) untuk setiap tabel berdasarkan role JWT:
    - `User`: Hanya ADMIN bisa INSERT/UPDATE/DELETE.
    - `Complaint`: ADMIN dapat INSERT/UPDATE/DELETE; PIC hanya UPDATE complaint miliknya (`picId = auth.uid()`); VERIFIKATOR update status verifikasi.
    - `Verification`: Hanya VERIFIKATOR/ADMIN yang bisa INSERT; bersifat immutable audit trail (tidak ada UPDATE/DELETE untuk authenticated).
    - `Document`: Hanya ADMIN bisa INSERT/UPDATE/DELETE.
- [x] **Sinkronisasi User ID & Penyelesaian Bug "Tugas Saya":**
  - [x] Sinkronisasi `User.id` dengan UUID `auth.users.id` di Supabase PostgreSQL via migrasi [20260925232000_sync_user_ids.sql](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/supabase/migrations/20260925232000_sync_user_ids.sql).
  - [x] Relasi foreign key `Complaint.picId` dan `Verification.verifierId` otomatis ter-cascade ke Supabase Auth UUID.
  - [x] Trigger otomatis `on_auth_user_created` pada `auth.users` untuk sinkronisasi akun baru ke tabel `public.User`.
  - [x] Helper `isAssignedToCurrentUser` di [src/components/DashboardClient.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/DashboardClient.tsx) mendukung pencocokan via UUID dan email untuk ketahanan filter "Tugas Saya" dan penghitungan `countMyTasks`.
  - [x] Validasi izin eksekusi di [src/app/actions/complaints.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/app/actions/complaints.ts) diperkuat dan otomatis menyinkronkan `picId` ke `user.id`.
- [x] **Konfigurasi skrip pencadangan (backup) database otomatis:**
  - [x] Pembuatan script [scripts/backup-db.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/scripts/backup-db.ts) dan perintah `npm run db:backup` untuk mengekspor snapshot data seluruh tabel (`User`, `Complaint`, `Verification`, `Document`) secara instan.
  - [x] Penyimpanan otomatis berkas snapshot bertimestamp ke folder `backups/` (sudah dimasukkan ke `.gitignore`).

---

## 🐬 Fase 5: Migrasi ke MySQL (XAMPP) + NextAuth + Cloudinary

- [x] **Pembersihan Dependensi & Arsitektur Supabase:**
  - [x] Uninstall paket `@supabase/ssr`, `@supabase/supabase-js`, dan `supabase` CLI.
  - [x] Hapus direktori `src/lib/supabase/` dan `supabase/migrations/`.
  - [x] Pasang paket `next-auth@4` dan `cloudinary`.
- [x] **Konfigurasi Autentikasi NextAuth.js:**
  - [x] Route handler NextAuth: [src/app/api/auth/[...nextauth]/route.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/app/api/auth/[...nextauth]/route.ts) dengan bcrypt dan peran KAI (Admin, PIC, Verifikator).
  - [x] Penggantian session resolver [src/lib/auth.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/lib/auth.ts) (`getCurrentUser()`, `requireUser()`).
  - [x] Middleware proteksi rute [src/middleware.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/middleware.ts) berbasis NextAuth.
  - [x] Halaman login [src/app/login/page.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/app/login/page.tsx) dan [src/components/LogoutButton.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/LogoutButton.tsx).
- [x] **Refactoring Query & Storage ke MySQL:**
  - [x] Konfigurasi provider `mysql` dan ID `uuid()` pada [prisma/schema.prisma](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/prisma/schema.prisma).
  - [x] Konversi seluruh query di [src/app/actions/complaints.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/app/actions/complaints.ts) dan [src/app/dashboard/page.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/app/dashboard/page.tsx) ke Prisma Client.
  - [x] Penyediaan endpoint upload Cloudinary [src/app/api/upload/route.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/app/api/upload/route.ts) dan [src/lib/cloudinary.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/lib/cloudinary.ts).
  - [x] Pengalihan upload foto bukti di [src/components/DashboardClient.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/DashboardClient.tsx) ke endpoint `/api/upload`.
  - [x] Pembersihan sinkronisasi Supabase di [prisma/seed.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/prisma/seed.ts) dan adaptasi [scripts/backup-db.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/scripts/backup-db.ts) ke Prisma.
  - [x] Konfigurasi koneksi MySQL di [.env](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/.env) (`DATABASE_URL="mysql://root:@localhost:3306/spkp_kai"`).
- [x] **Migrasi & Seeding Database MySQL (XAMPP):**
  - [x] Pembuatan database `spkp_kai` di MySQL XAMPP.
  - [x] Eksekusi `npx prisma migrate dev --name init_mysql`.
  - [x] Eksekusi `npx prisma db seed`.
  - [x] Uji coba script pencadangan database MySQL (`npm run db:backup`).
- [x] **Uji Fungsionalitas & Validasi QA End-to-End (Browser Subagent):**
  - [x] Autentikasi kredensial NextAuth (`admin@spkp.kai.id` / `password123`) berhasil validasi password bcrypt dari MySQL.
  - [x] Redirect mulus ke `/dashboard` dengan role badge `ADMIN` ("Administrator SPKP").
  - [x] Data tabel keluhan dari MySQL XAMPP (`CMP-2026-001`, `CMP-2026-002`, `CMP-2026-003`) tampil akurat.
  - [x] Modal detail keluhan interaktif dapat dibuka dan ditutup dengan data lengkap.
- [x] **Revisi Fungsionalitas Role Admin & Redesain Dashboard:**
  - [x] Sembunyikan tombol ekspor Excel (`.xlsx`) di sidebar dan toolbar khusus untuk role Admin.
  - [x] Hilangkan indikator deadline/tenggat waktu SLA pengerjaan PIC dari kolom status tabel dan modal detail keluhan.
  - [x] Ubah tema sidebar ke **Dark Executive Navy** (`bg-slate-900`) dengan kontras aksen oranye dan biru khas KAI.
  - [x] Restrukturisasi form *"Catat Keluhan Baru"* menjadi format **vertikal satu kolom** yang lega dan nyaman diisi.
  - [x] Integrasikan grafik *"Analisis Saluran"* eksklusif pada menu **Ringkasan & Metrik**, sehingga menu Daftar Keluhan dan Verifikasi Mutu lebih ringkas dan fokus.

---

## 🚫 FASE: Penghapusan Menyeluruh Fitur SLA (Selesai ✅)

- [x] **Audit Kode & Skema Database:**
  - [x] Audit menyeluruh seluruh direktori proyek untuk mendeteksi dependensi SLA (model Prisma, service, komponen UI, filter, overview metrics, dan test suites).
- [x] **Pembersihan Database & Skema Prisma:**
  - [x] Penghapusan model `SlaPolicy` dan enum `SlaCalendarType` dari [prisma/schema.prisma](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/prisma/schema.prisma).
  - [x] Penghapusan kolom snapshot SLA (`slaTargetHours`, `slaCalendarType`, `slaPolicyId`) dan foreign key relasi dari model `Complaint`.
  - [x] Pembuatan berkas migrasi baru [prisma/migrations/20261018061500_remove_sla_features/migration.sql](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/prisma/migrations/20261018061500_remove_sla_features/migration.sql) dan deployment database aman tanpa data reset.
  - [x] Penghapusan seeding `SlaPolicy` dari [prisma/seed.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/prisma/seed.ts).
- [x] **Pembersihan Backend & Types:**
  - [x] Penghapusan modul perhitungan SLA `src/lib/sla.ts`.
  - [x] Penghapusan tipe data SLA (`SlaCalendarType`, `SlaPolicyData`, field SLA `ComplaintData`) dari [src/types/database.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/types/database.ts).
  - [x] Pembersihan logika snapshot SLA pada fungsi `createComplaint` di [src/app/actions/complaints.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/app/actions/complaints.ts).
- [x] **Pembersihan Antarmuka Pengguna (UI/UX):**
  - [x] Penghapusan komponen `src/components/dashboard/SlaBadge.tsx`.
  - [x] Pembersihan kartu risiko SLA, metrik kepatuhan SLA, dan tombol filter risiko SLA pada [AdminOverview.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/dashboard/AdminOverview.tsx).
  - [x] Penyesuaian KPI PIC menjadi 4 metrik independen operasional (Tugas Aktif, Perlu Revisi, Menunggu Review, Selesai) pada [PicOverview.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/dashboard/PicOverview.tsx).
  - [x] Penyesuaian KPI Verifikator (Antrean Verifikasi, Proses Lapangan, Telah Disetujui, Total Revisi Diminta) pada [VerifierOverview.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/dashboard/VerifierOverview.tsx).
  - [x] Penghapusan filter dropdown SLA, kolom "Status & SLA" menjadi "Status", dan render badge SLA pada [ComplaintTable.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/dashboard/ComplaintTable.tsx).
  - [x] Pembersihan tampilan badge SLA pada [ComplaintDetailModal.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/dashboard/ComplaintDetailModal.tsx).
  - [x] Pembersihan state dan handlers filter SLA pada [DashboardClient.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/DashboardClient.tsx).
- [x] **Pembersihan Pengujian (Tests) & Verifikasi QA:**
  - [x] Penghapusan test suite `tests/sla.test.ts`.
  - [x] Penyesuaian test suite [tests/ui_dashboard_phase6.test.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/tests/ui_dashboard_phase6.test.ts) dan [tests/e2e_security_release.test.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/tests/e2e_security_release.test.ts) (84 tests lulus 100%).
  - [x] Verifikasi TypeScript (`tsc --noEmit`), ESLint (`next lint`), dan Next.js production build (`next build`) lulus tanpa error.

---

## 📑 FASE: Perbaikan Snapshot dan Arsip Dokumen KAI (Selesai ✅)

- [x] **Audit & Pemisahan Penerbitan dari Aksi Baca (Print & PDF):**
  - [x] Audit implementasi [src/app/actions/complaints.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/app/actions/complaints.ts), [src/components/KaiDocumentModal.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/KaiDocumentModal.tsx), [src/components/KaiDocumentView.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/KaiDocumentView.tsx), dan [src/components/pdf/KaiDocumentPdf.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/pdf/KaiDocumentPdf.tsx).
  - [x] Memastikan tombol Print dan Unduh PDF tidak memicu mutasi atau penerbitan ulang (hanya membaca snapshot beku arsip).
  - [x] Pemisahan ketat proses penerbitan resmi (`createDocumentBatch`) sebagai mutasi tersendiri yang membekukan keluhan terverifikasi ke dalam `snapshotData`.
- [x] **Integritas Snapshot Kebal Ubah (Immutable Snapshot):**
  - [x] Snapshot menyimpan seluruh informasi rekapitulasi secara mandiri: identitas keluhan, nomor tiket, nama pelanggan, kontak, stasiun/Daop, kategori, uraian keluhan, PIC, tindakan perbaikan, tindakan pencegahan, foto bukti, catatan, status, verifikator, kesimpulan verifikasi, dan nomor siklus.
  - [x] Perubahan data keluhan aktif di database tidak mempengaruhi snapshot arsip dokumen yang telah diterbitkan.
  - [x] Perlindungan penimpaan dokumen: dokumen yang sudah diterbitkan tidak boleh ditimpa atau dihapus.
- [x] **Mekanisme Dokumen Revisi (Revision Lineage):**
  - [x] Dukungan rantai revisi dokumen: dokumen baru dapat merevisi dokumen sebelumnya dengan `parentDocumentId`, `revisionReason`, dan increment `revisionNumber`.
  - [x] Dokumen lama otomatis ditandai sebagai `SUPERSEDED` dan arsip aslinya tetap utuh untuk kebutuhan audit.
  - [x] Mode revisi interaktif di UI [src/components/KaiDocumentModal.tsx](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/src/components/KaiDocumentModal.tsx).
- [x] **Pencegahan Bentrok Nomor Dokumen & Concurrency-Safe Counter:**
  - [x] Model `DocumentCounter` di [prisma/schema.prisma](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/prisma/schema.prisma) untuk menghasilkan nomor dokumen atomik per bulan dan tahun (`FR.SM/TI/033.001/MM-YYYY`).
  - [x] Migrasi aman [prisma/migrations/20261018064500_add_document_counter/migration.sql](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/prisma/migrations/20261018064500_add_document_counter/migration.sql) tanpa reset database atau penghapusan data arsip historis.
  - [x] Jaminan dua transaksi penerbitan bersamaan (konkuren) tidak akan menghasilkan nomor dokumen yang sama.
- [x] **Penyempurnaan Lookup & Proteksi Data Historis:**
  - [x] Fungsi `getPublishedDocument` kini mendukung query berdasarkan `id` unik dokumen maupun `documentNumber`, mencegah ambiguitas jika terdapat nomor serupa.
  - [x] Penanganan aman dokumen lama yang belum memiliki snapshot: UI tidak mengarang atau mencampur data keluhan terkini ke arsip lama.
- [x] **Pengujian Komprehensif (92 Tests Lulus 100%):**
  - [x] Penambahan test suite validasi transaksi, konkurensi, snapshot immutability, dan rantai revisi di [tests/kai_document_print_pdf.test.ts](file:///c:/Users/novaa/OneDrive/Documents/MAGANG/SPKP/tests/kai_document_print_pdf.test.ts).
  - [x] Seluruh 7 test files (92 tests) lulus 100%.
  - [x] TypeScript compiler (`tsc --noEmit`), ESLint (`next lint`), dan Next.js production build (`next build`) lulus tanpa peringatan atau error.

---

## 🔐 Fase 4: Penguatan Hak Akses PIC dan Persetujuan Reopen (Selesai ✅)

- [x] **Audit Menyeluruh Hak Akses:**
  - [x] Identifikasi Admin override ilegal pada `canExecuteComplaint`, `SAVE_PROGRESS` state machine, dan `updateComplaintProgress` server action.
  - [x] Identifikasi celah self-approval pada `reviewReopenRequest`.

- [x] **Perbaikan `permissions.ts` — `canExecuteComplaint`:**
  - [x] Hapus baris `if (user.role === Role.ADMIN) return true` yang membolehkan Admin override tindakan penanganan PIC.
  - [x] Hanya PIC yang ditugaskan yang dapat mengeksekusi keluhan (separation of duties).

- [x] **Perbaikan `state-machine.ts` — Aksi `SAVE_PROGRESS`:**
  - [x] Guard diubah dari `!== PIC && !== ADMIN` menjadi hanya `!== PIC`.
  - [x] Admin tidak lagi dapat menyimpan progres penanganan atas nama PIC.

- [x] **Perbaikan `complaints.ts` — `updateComplaintProgress`:**
  - [x] Guard awal diubah menjadi hanya `Role.PIC` — Admin mendapat HTTP 403 FORBIDDEN.
  - [x] Ownership check diubah dari `if (user.role === Role.PIC && complaint.picId !== user.id)` menjadi `if (complaint.picId !== user.id)` tanpa pengecualian role — sehingga tidak ada celah lewat manipulasi endpoint langsung.

- [x] **Perbaikan `complaints.ts` — `reviewReopenRequest` (Self-Approval Prevention):**
  - [x] Tambah guard: jika `reopenReq.requestedById === user.id`, lempar error "Pemohon tidak dapat menyetujui permohonan yang diajukan sendiri."
  - [x] Menerapkan four-eyes principle pada alur reopen: pengaju dan peninjau harus orang berbeda.
  - [x] Status PENDING dicek di dalam transaksi sebelum diproses — mencegah dua Admin menyetujui permohonan yang sama secara bersamaan (konkurensi aman).

- [x] **Dokumentasi Matriks Hak Akses (Final):**
  | Aksi | Admin | PIC (Ditugaskan) | PIC (Lain) | Verifikator |
  |------|-------|-----------------|-----------|-------------|
  | Buat keluhan | ✅ | ❌ | ❌ | ❌ |
  | Tetapkan/ganti PIC | ✅ | ❌ | ❌ | ❌ |
  | Simpan progres (SAVE_PROGRESS) | ❌ | ✅ | ❌ | ❌ |
  | Ajukan verifikasi | ❌ | ✅ | ❌ | ❌ |
  | Verifikasi / Setujui / Tolak | ❌ | ❌ | ❌ | ✅ |
  | Hapus keluhan | ✅ | ❌ | ❌ | ❌ |
  | Terbitkan dokumen | ✅ | ❌ | ❌ | ❌ |
  | Ajukan reopen | ✅ | ❌ | ❌ | ✅ |
  | Setujui/tolak reopen (bukan pemohon sendiri) | ✅ | ❌ | ❌ | ❌ |

- [x] **Pengujian — Suite Baru `tests/fase4_rbac_reopen.test.ts` (35 Tests):**
  - [x] PIC mengubah keluhan yang ditugaskan kepadanya (diizinkan).
  - [x] PIC tidak dapat mengubah keluhan PIC lain (ditolak).
  - [x] Admin tidak dapat menyimpan progres atas nama PIC (ditolak di permissions + state machine).
  - [x] Verifikator tidak dapat menjalankan aksi PIC (ditolak).
  - [x] Pemohon reopen tidak dapat menyetujui permohonannya sendiri (ditolak).
  - [x] Reopen disetujui: status DALAM_PENANGANAN, PIC tetap sama, completedAt = null.
  - [x] Reopen ditolak: status TERVERIFIKASI tidak berubah, rekaman histori tersimpan.
  - [x] Dua Admin tidak dapat memproses reopen yang sama bersamaan (status guard atomik).
  - [x] Semua pemanggilan endpoint tunduk pada pemeriksaan otorisasi berlapis.
- [x] **Pembaruan `tests/auth_rbac.test.ts`:**
  - [x] Ganti test "Admin memiliki hak override" dengan test "Admin TIDAK memiliki hak override eksekusi penanganan (separation of duties — Fase 4)".
- [x] **Hasil Akhir: 127 tests lulus 100% — TypeScript clean — 8 test files.**

