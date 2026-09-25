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


