# Laporan Audit Awal — SPKP (Sistem Penanganan Keluhan Pelanggan)

> **Tanggal Audit:** 2026-10-10
> **Branch:** `perbaikan`
> **Auditor:** AI Senior Software Engineer (Antigravity)
> **Status:** FASE 1 SELESAI

---

## 1. Ringkasan Teknologi & Arsitektur Aktual

| Komponen | Teknologi Aktual | Catatan |
|---|---|---|
| **Framework** | Next.js 14.2.15 (App Router) | konfirmasi next.config.mjs |
| **UI** | React 18 + Tailwind CSS v3 | OK |
| **Bahasa** | TypeScript (strict via tsconfig) | OK |
| **Autentikasi** | NextAuth.js v4 (Credentials Provider + bcryptjs) | README masih menyebut Supabase Auth |
| **Database** | MySQL (XAMPP lokal, spkp_kai) | README menyebut PostgreSQL Supabase |
| **ORM** | Prisma v5.22.0 | Schema mysql, terverifikasi |
| **Upload Foto Bukti** | Local filesystem public/uploads/ | README menyebut Supabase Storage; cloudinary terpasang tapi TIDAK digunakan |
| **PDF Export** | @react-pdf/renderer v4.9.0 | OK |
| **Excel Export** | xlsx (SheetJS) v0.18.5 | OK |
| **Testing** | Vitest v5.0.2 | 36 tests, semua PASS |
| **Backup DB** | Script Prisma scripts/backup-db.ts | JSON di backups/ |
| **Session** | JWT maxAge 8 jam via NextAuth | OK |

### Arsitektur Aktual (Pasca-Migrasi Fase 5)

  Browser -> Next.js App Router (localhost:3001)
               +-- /login          -> NextAuth signIn (Credentials + bcrypt)
               +-- /dashboard      -> Server Component -> Prisma -> MySQL
               +-- /api/auth/[...nextauth] -> NextAuth route handler
               +-- /api/upload     -> Local file upload ke public/uploads/

Database yang digunakan: MySQL lokal via XAMPP (bukan PostgreSQL/Supabase).
Autentikasi: NextAuth.js v4 JWT (bukan Supabase Auth).
Storage: Local filesystem (bukan Supabase Storage atau Cloudinary).

---

## 2. Struktur Modul Penting

  src/
  +-- app/
  |   +-- actions/complaints.ts     8 Server Actions (CRUD keluhan, assign PIC, verifikasi, dokumen)
  |   +-- actions/auth.ts           Stub kosong (auth ditangani NextAuth langsung)
  |   +-- api/auth/[...nextauth]/   NextAuth route handler
  |   +-- api/upload/route.ts       Upload foto bukti ke public/uploads/
  |   +-- dashboard/page.tsx        Server Component, query Prisma + render DashboardClient
  |   +-- login/page.tsx            Client Component, signIn() NextAuth
  +-- components/
  |   +-- DashboardClient.tsx       Komponen UI utama (2544 baris!), semua logika dashboard
  |   +-- KaiDocumentModal.tsx      Modal PDF FR.SM/TI/033.001
  |   +-- LogoutButton.tsx          signOut() NextAuth
  |   +-- pdf/KaiDocumentPdf.tsx    Renderer PDF @react-pdf
  |   +-- SourceComparisonChart.tsx Grafik analisis saluran keluhan
  +-- lib/
  |   +-- auth-options.ts           NextAuthOptions (Credentials Provider, JWT callbacks)
  |   +-- auth.ts                   getCurrentUser(), requireUser() via getServerSession()
  |   +-- cloudinary.ts             Cloudinary config (terpasang tapi TIDAK digunakan di upload)
  |   +-- complaintNumber.ts        Generator CMP-YYYY-XXX
  |   +-- exportExcel.ts            Generator .xlsx (SheetJS)
  |   +-- permissions.ts            Matriks RBAC (canAssignPIC, canExecute, canVerify, dll)
  |   +-- prisma.ts                 PrismaClient singleton
  |   +-- sla.ts                    Kalkulasi SLA 24 jam
  |   +-- validation.ts             Validasi form input (complaint, PIC, verifikasi)
  +-- middleware.ts                 Proteksi rute via NextAuth middleware (re-export)
  +-- types/
      +-- database.ts               Enum & interface TS (Role, ComplaintStatus, dll.)
      +-- next-auth.d.ts            Module augmentation NextAuth (id, role di Session/JWT)
      +-- auth.ts                   File kecil, 142 bytes

  prisma/
  +-- schema.prisma                 MySQL, 4 model: User, Complaint, Verification, Document
  +-- seed.ts                       Seeding akun demo + keluhan contoh
  +-- migrations/20261008075241_init_mysql/  Satu migrasi Prisma Migrate

  tests/
  +-- auth_rbac.test.ts             14 tests RBAC Permissions
  +-- complaintNumber.test.ts       5 tests format CMP-YYYY-XXX
  +-- sla.test.ts                   4 tests kalkulasi SLA
  +-- validation.test.ts            13 tests validasi form

---

## 3. Kondisi Awal Test, Lint, TypeScript, dan Build

### Unit Test (Vitest) — BENAR-BENAR DIJALANKAN

Perintah: npm test (= vitest run)
Hasil: 36/36 PASS — Durasi 1.46 detik

| Test Suite | File | Hasil |
|---|---|---|
| RBAC Permissions | tests/auth_rbac.test.ts | 14/14 PASS |
| SLA Calculation | tests/sla.test.ts | 4/4 PASS |
| Complaint Number | tests/complaintNumber.test.ts | 5/5 PASS |
| Form Validation | tests/validation.test.ts | 13/13 PASS |

Semua test berjalan murni pada unit logika (tidak menyentuh database/network).
Tidak ada test integrasi atau E2E.

### TypeScript Check — BENAR-BENAR DIJALANKAN

Perintah: npx tsc --noEmit
Hasil: 0 error, 0 warning — Exit code 0

### ESLint — BENAR-BENAR DIJALANKAN

Perintah: npm run lint (= next lint)
Hasil: "No ESLint warnings or errors" — Exit code 0

### Build Produksi — BELUM DIJALANKAN

Build produksi (npm run build) belum dijalankan karena memerlukan koneksi database aktif (MySQL XAMPP harus berjalan). Direkomendasikan dijalankan setelah memastikan XAMPP aktif.

### Koneksi Database — BELUM DIVERIFIKASI LANGSUNG

Query langsung ke MySQL tidak dijalankan karena status XAMPP tidak diketahui.

---

## 4. Temuan Keamanan

### P0 — Risiko Kritis

#### P0-1: Kredensial Demo Hardcoded di Source Code & README

- Lokasi: src/app/login/page.tsx baris 42 — password "password123" hardcoded dalam fungsi handleQuickFill
- Lokasi: README.md baris 135-137 — email dan password akun demo dipublikasikan
- Risiko: Jika repository di-push ke GitHub, kredensial sistem internal KAI terekspos.
  Password default yang sama untuk 3 role berbeda.
- Rekomendasi:
  - Di production, hapus fitur Quick Fill dan akun demo ini.
  - Ganti password semua akun demo menjadi nilai yang tidak bisa ditebak.
  - Tambahkan peringatan eksplisit bahwa README ini hanya untuk lingkungan development.

#### P0-2: File .env.example Berisi Variabel Supabase yang Sudah Tidak Digunakan

- Situasi: .env sudah ada di .gitignore — AMAN, tidak akan ikut commit
- Masalah: .env.example masih berisi format variabel Supabase (NEXT_PUBLIC_SUPABASE_URL, NEXT_SERVICE_ROLE_KEY, dll.)
  padahal sistem sudah pindah ke MySQL + NextAuth + Cloudinary.
- Risiko: Developer baru yang mengikuti .env.example akan mengonfigurasi variabel yang salah dan sistem tidak berfungsi.
- Variabel .env aktual yang benar: DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

#### P0-3: Upload Foto Bukti ke Local Filesystem — Tidak Aman & Tidak Persisten di Production

- Lokasi: src/app/api/upload/route.ts
- Implementasi aktual: File ditulis ke public/uploads/ via fs.writeFile — BUKAN ke Cloudinary
- Paket cloudinary terpasang (src/lib/cloudinary.ts terkonfigurasi) TAPI tidak digunakan di upload route
- Risiko:
  1. File di public/uploads/ ikut di-serve oleh Next.js secara publik tanpa autentikasi
  2. Di production environment (Vercel, container), folder public/uploads/ tidak persisten — file hilang saat redeploy
  3. Path traversal: ekstensi diambil langsung dari file.name.split(".").pop() — bisa dimanipulasi
- KEPUTUSAN DIPERLUKAN: Apakah ingin mengaktifkan Cloudinary atau tetap local?

### P1 — Kerusakan Alur Inti / Hak Akses

#### P1-1: Role Admin Dapat Melakukan Verifikasi (Potensi Bypass Separation of Duty)

- Lokasi: src/app/actions/complaints.ts baris 221
  Kode: if (user.role !== Role.VERIFIKATOR && user.role !== Role.ADMIN) -> Admin diizinkan memverifikasi
- Lokasi: src/lib/permissions.ts baris 48
  Kode: user.role === Role.VERIFIKATOR || user.role === Role.ADMIN
- Risiko Bisnis: Dalam SOP mutu KAI, verifikasi seharusnya dilakukan pihak independen.
  Membiarkan Admin memverifikasi sendiri merusak prinsip four-eyes principle.
- KEPUTUSAN DIPERLUKAN: Ini mungkin disengaja (Admin sebagai supervisor). Konfirmasi diperlukan.

### P2 — Masalah Fungsional Penting

#### P2-1: Cloudinary Terpasang tapi Tidak Digunakan

- Package cloudinary ada di dependencies, src/lib/cloudinary.ts dikonfigurasi,
  namun src/app/api/upload/route.ts menulis ke filesystem lokal.
- Keputusan diperlukan: aktifkan Cloudinary atau hapus dependency?

#### P2-2: src/app/auth/ Masih Ada Sebagai Direktori Tidak Terpakai

- Sisa arsitektur Supabase lama. Perlu diperiksa isinya sebelum dihapus.

#### P2-3: DashboardClient.tsx Terlalu Besar (2544 baris, 132KB)

- Satu komponen besar menyulitkan maintenance dan debugging.

#### P2-4: Casting `as any` Tersebar di Server Actions

- Misalnya: status: initialStatus as any di complaints.ts.
  Menyembunyikan potensi type mismatch antara enum TS dan Prisma.

### P3 — Perbaikan Maintainability / Optimasi

#### P3-1: README.md Sudah Usang

- Masih mendeskripsikan Supabase Auth, Supabase Storage, PostgreSQL.
- Struktur direktori menyebut file yang sudah dihapus.
- Panduan instalasi akan menyesatkan developer baru.

#### P3-2: next.config.mjs Menggunakan images.unoptimized: true

- Menonaktifkan optimasi gambar Next.js. Tidak masalah untuk dev, berpengaruh di production.

#### P3-3: Tidak Ada Test Integrasi atau E2E

- Semua 36 test adalah unit test murni (tanpa database/network).
- Alur kritis seperti login, buat keluhan, upload foto, verifikasi — tidak dicover test otomatis.

---

## 5. Ketidaksesuaian Dokumentasi vs Implementasi

| Dokumen | Klaim Dokumentasi | Realita Implementasi |
|---|---|---|
| README.md | Autentikasi: Supabase Auth (@supabase/ssr) | SALAH: Aktual NextAuth.js v4 (Credentials + bcrypt) |
| README.md | Database: PostgreSQL di Supabase Cloud | SALAH: Aktual MySQL lokal via XAMPP |
| README.md | Storage: Supabase Storage bucket complaint-proofs | SALAH: Aktual Local filesystem public/uploads/ |
| README.md | Struktur direktori ada src/lib/supabase/ | SALAH: Direktori sudah dihapus (Fase 5) |
| README.md | Struktur direktori ada src/app/auth/callback/ | SALAH: File sudah dihapus |
| README.md | Variabel .env: SUPABASE_URL, SUPABASE_KEY | SALAH: Aktual DATABASE_URL, NEXTAUTH_SECRET, CLOUDINARY_* |
| .env.example | Template untuk Supabase + PostgreSQL | SALAH: Aktual MySQL + NextAuth + Cloudinary |
| TODO.md Fase 5 | Cloudinary digunakan untuk upload foto | SALAH: Upload route aktual menggunakan local filesystem |
| schema.prisma | Komentar "(Supabase Storage)" di proofImageUrl | Usang: Local filesystem atau Cloudinary |

---

## 6. Risiko terhadap Database dan Data Pengguna

| Risiko | Tingkat | Detail |
|---|---|---|
| Kehilangan data upload di production | TINGGI | File di public/uploads/ tidak persisten di Vercel/container |
| Tidak ada backup otomatis terjadwal | SEDANG | Script ada tapi harus dijalankan manual |
| MySQL lokal tidak redundan | SEDANG | Single point of failure, tidak ada replikasi |
| Password akun demo mudah ditebak | SEDANG | password123 untuk semua role |
| Tidak ada soft-delete | RENDAH | deleteComplaint menghapus data permanen, tidak ada recycle bin |

### Migrasi yang AMAN saat ini:
- Ada satu migrasi: 20261008075241_init_mysql (Prisma Migrate)
- Backup script tersedia di scripts/backup-db.ts
- Folder backups/ ada di .gitignore

### PERINGATAN DATABASE:
JANGAN menjalankan prisma migrate reset atau prisma db push --force-reset.
Ini akan menghapus seluruh data di MySQL.
JANGAN menjalankan prisma db push tanpa backup terlebih dahulu.

---

## 7. Daftar Masalah yang Perlu Diperbaiki pada Fase Berikutnya

| ID | Masalah | Prioritas |
|---|---|---|
| M1 | .env.example masih berisi variabel Supabase lama | P0 |
| M2 | Upload foto menggunakan local filesystem — tidak persisten di production | P0 |
| M3 | Password demo password123 hardcoded di login/page.tsx dan README.md | P0 |
| M4 | Komentar usang di schema.prisma (Supabase Storage) di field proofImageUrl | P3 |
| M5 | README.md perlu diperbarui total agar mencerminkan stack aktual | P3 |
| M6 | src/app/auth/ direktori lama perlu diperiksa dan dibersihkan | P2 |
| M7 | Konfirmasi apakah Admin boleh memverifikasi keluhan (SOP KAI) | P1 |
| M8 | DashboardClient.tsx 2544 baris perlu dipecah menjadi sub-komponen | P3 |
| M9 | Tidak ada test integrasi atau E2E untuk alur kritis | P3 |
| M10 | next.config.mjs menggunakan images.unoptimized: true | P3 |
| M11 | Package cloudinary terpasang tapi tidak digunakan | P2 |

---

## 8. Rekomendasi Urutan Pengerjaan

### Segera (Fase 2A — Aman, Tidak Menyentuh Database):
1. M1: Perbarui .env.example sesuai stack aktual (aman, hanya edit teks)
2. M4, M11-komentar: Bersihkan komentar usang di schema.prisma (hanya komentar)
3. M5: Perbarui README.md (hanya dokumentasi)

### Setelah Keputusan Anda (Fase 2B — Perlu Konfirmasi):
4. M2: Putuskan: aktifkan Cloudinary atau pertahankan local upload?
   - Jika Cloudinary: perlu edit api/upload/route.ts — tidak mengubah database
   - Jika local: hapus package cloudinary yang tidak digunakan
5. M3: Putuskan: apakah Quick Fill demo dibiarkan (untuk dev) atau diganti?
6. M7: Konfirmasi: apakah Admin boleh verifikasi atau dibatasi ke Verifikator saja?

### Fase Berikutnya (Fase 2C — Refactor & Hardening):
7. M6: Periksa dan bersihkan src/app/auth/ (perlu dilihat isinya dulu)
8. M8: Pecah DashboardClient.tsx menjadi sub-komponen
9. M9: Tambahkan test integrasi untuk alur kritis

---

## Lampiran: Perintah yang Benar-benar Dijalankan & Hasilnya

| Perintah | Waktu | Hasil |
|---|---|---|
| `git init && git checkout -b perbaikan` | 22:48:14 | OK: Branch perbaikan dibuat |
| `git status` | 22:48:55 | OK: Perubahan diverifikasi |
| `npm test` | 23:18:23 | OK: 36/36 tests PASS (Vitest) |
| `npx tsc --noEmit` | 23:18:36 | OK: 0 TypeScript error |
| `npm run lint` | 23:18:59 | OK: No ESLint warnings or errors |
| `npm run build` | 23:20:24 | OK: 7/7 halaman ter-generate sukses |

---

## 9. Tindak Lanjut Keputusan Pengguna (Implemented)

Berdasarkan keputusan pengguna:
1. **M2 (Upload Storage):** Cloudinary telah **diaktifkan** di `src/app/api/upload/route.ts` menggantikan upload local filesystem.
2. **M3 (Kredensial Demo):** Kredensial demo `password123` **dipertahankan** khusus untuk mode development.
3. **M7 (Verifikasi Mutu):** Verifikasi telah **dibatasi secara ketat hanya untuk role VERIFIKATOR** (Admin dilarang verifikasi sesuai *four-eyes principle* SOP KAI) di `src/lib/permissions.ts`, `src/app/actions/complaints.ts`, dan unit test `tests/auth_rbac.test.ts`.
4. **Pembersihan UI & Schema:** Label `Supabase Storage` telah diganti menjadi `Cloudinary` di `DashboardClient.tsx` dan `prisma/schema.prisma`.
5. **Konfigurasi Environment:** `.env.example` telah dimutakhirkan ke stack aktual: MySQL + NextAuth + Cloudinary.

