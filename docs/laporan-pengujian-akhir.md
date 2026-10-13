# LAPORAN PENGUJIAN AKHIR, KEAMANAN, DAN KESIAPAN RILIS SPKP KAI
**Sistem Penanganan Keluhan Pelanggan (SPKP) — PT Kereta Api Indonesia (Persero)**  
**Standar Pengendalian Mutu Internal: FR.SM/TI/033.001**

> **Tanggal Pelaksanaan:** 14 Oktober 2026  
> **Peran:** Senior QA Engineer & Release Engineer  
> **Branch Git:** `perbaikan`  
> **Status Keseluruhan Sistem:** **LULUS UJI — SIAP MENUJU TAHAP PERSIAPAN RILIS (STAGING / PROD)**

---

## 1. Ringkasan Eksekutif

Pengujian akhir menyeluruh telah dijalankan untuk memvalidasi stabilitas, integritas data, ketahanan keamanan otorisasi (*Four-Eyes Principle*), kepatuhan SLA dinamis, imutabilitas arsip dokumen, dan kesiapan rilis sistem SPKP setelah penyelesaian seluruh fase perbaikan (Fase 1 s.d. Fase 6).

Pemeriksaan teknis meliputi pengujian unit, integrasi alur bisnis (*end-to-end*), keamanan otorisasi negatif, migrasi skema database, linting kode, type checking TypeScript, dan build bundel produksi Next.js.

### Rekapitulasi Status Pemeriksaan

| Kategori Pengujian / Pemeriksaan | Jumlah Skenario | Status Aktual | Keterangan |
|---|---|---|---|
| **Pemeriksaan Tipe TypeScript (`tsc`)** | Seluruh Modul | **LULUS** | 0 error, 100% strict type safety. |
| **Pemeriksaan Kualitas Kode (ESLint)** | Seluruh Direktori | **LULUS** | 0 warning, 0 error. |
| **Validasi & Generate Prisma Schema** | Model & Migrasi | **LULUS** | Skema valid, Prisma Client v5.22.0 ter-generate. |
| **Status Migrasi Database MySQL** | 2 Migrasi Aktif | **LULUS** | Database schema is up to date (`spkp_kai`). |
| **Test Suite Otomatis (Vitest)** | 7 Suites / 84 Tests | **LULUS (100%)** | 84 skenario sukses, 0 gagal. |
| **Next.js Production Build (`build`)** | 7 Rute Halaman | **LULUS** | Kompilasi statis dan dinamis sukses. |
| **Otorisasi Server Actions & RBAC** | 14 Skenario | **LULUS** | Akses ilegal ditolak di level server & transaksi. |
| **Separation of Duties (Four-Eyes)** | 5 Skenario | **LULUS** | Admin dilarang memverifikasi, PIC dilarang ubah tiket lain. |
| **SLA & TargetSnapshot Retention** | 8 Skenario | **LULUS** | Target jam per kategori beku, durasi akurat. |
| **Imutabilitas Dokumen Arsip** | 4 Skenario | **LULUS** | Snapshot beku tidak terpengaruh mutasi data aktif. |

---

## 2. Inventarisasi dan Status Pengujian Aktual

Pengujian otomatis dijalankan menggunakan test runner **Vitest** dengan rincian suite sebagai berikut:

```text
 ✓ tests/fase7_e2e_security_release.test.ts (16 tests)
 ✓ tests/backend_state_machine.test.ts (20 tests)
 ✓ tests/auth_rbac.test.ts (14 tests)
 ✓ tests/validation.test.ts (13 tests)
 ✓ tests/ui_dashboard_phase6.test.ts (12 tests)
 ✓ tests/complaintNumber.test.ts (5 tests)
 ✓ tests/sla.test.ts (4 tests)

 Test Files  7 passed (7)
      Tests  84 passed (84)
   Duration  1.17s
```

### Rincian Per Suite Pengujian

1. **`tests/fase7_e2e_security_release.test.ts` (16 Skenario — LULUS):**
   - Siklus hidup normal (Happy Path) dari pembuatan tiket hingga approve dan reopen.
   - Siklus penolakan (Rejection Loop) dengan retensi penugasan PIC dan pelacakan *cycle counter*.
   - Larangan Admin memverifikasi (*Four-Eyes Principle*).
   - Larangan PIC mengeksekusi tiket milik PIC lain (*Ownership Isolation*).
   - Penolakan mutasi pengguna tanpa autentikasi (*Session Guard*).
   - Penolakan transisi status ilegal (*State Machine Enforcement*).
   - Penolakan verifikasi tanpa catatan/alasan.
   - Proteksi keluhan yang sudah berstatus arsip dari penghapusan (*Document Guard*).
   - Keunikan nomor keluhan standar KAI (`CMP-YYYY-XXX`).
   - Perhitungan SLA dengan target snapshot per jenis keluhan (12j, 24j, 48j).
   - Pengukuran waktu penyelesaian resmi berbasis `completedAt` saat verifikator menyetujui.
   - Penanganan nilai tanggal invalid / null tanpa throw exception (*Robustness*).
   - Imutabilitas snapshot dokumen arsip resmi.
   - Pembatasan penerbitan dokumen audit hanya untuk tiket `TERVERIFIKASI`.

2. **`tests/backend_state_machine.test.ts` (20 Skenario — LULUS):**
   - Transisi status `BELUM_DITANGANI` &rarr; `DALAM_PENANGANAN` &rarr; `MENUNGGU_VERIFIKASI` &rarr; `TERVERIFIKASI`.
   - Transisi penolakan `MENUNGGU_VERIFIKASI` &rarr; `DALAM_PENANGANAN`.
   - Transisi permohonan pembukaan kembali `TERVERIFIKASI` &rarr; `DALAM_PENANGANAN`.

3. **`tests/auth_rbac.test.ts` (14 Skenario — LULUS):**
   - Matriks otorisasi peran Admin, PIC, dan Verifikator pada setiap operasi server.

4. **`tests/validation.test.ts` (13 Skenario — LULUS):**
   - Validasi nama pelapor (min 3 karakter), deskripsi keluhan (min 10 karakter), validitas saluran KAI resmi, batas tindakan korektif/preventif, dan catatan penolakan.

5. **`tests/ui_dashboard_phase6.test.ts` (12 Skenario — LULUS):**
   - Perhitungan metrik overview Admin (tiket belum ditugaskan & risiko SLA).
   - Filter tugas aktif PIC dan deteksi tiket perlu revisi.
   - Antrean kritis verifikator.
   - Logika pagination dan filter multi-dimensi.

6. **`tests/complaintNumber.test.ts` (5 Skenario — LULUS):**
   - Pemformatan nomor keluhan, parsing sequence tahunan, dan penanganan urutan baru.

7. **`tests/sla.test.ts` (4 Skenario — LULUS):**
   - Perhitungan durasi, status Overdue, status Near Deadline (sisa &le; 6 jam), dan status SLA OK.

---

## 3. Cakupan Alur Bisnis yang Telah Diuji

### A. Alur Normal (Happy Path) — [LULUS]
1. **Registrasi:** Admin mencatat keluhan baru &rarr; Sistem men-generate nomor registrasi terurut &rarr; Status awal `BELUM_DITANGANI`.
2. **Penugasan PIC:** Admin menugaskan staf PIC teknis &rarr; Status bertransisi ke `DALAM_PENANGANAN` &rarr; Timestamp `assignedAt` dan audit log tercatat.
3. **Eksekusi Lapangan:** PIC mengisi tindakan perbaikan dan pencegahan &rarr; PIC mengunggah foto bukti fisik via Cloudinary &rarr; PIC mengajukan hasil ke tim mutu.
4. **Verifikasi Mutu:** Status berubah ke `MENUNGGU_VERIFIKASI` &rarr; Timestamp `submittedAt` tercatat &rarr; Verifikator meninjau bukti fisik dan menyetujui.
5. **Penyelesaian Final:** Status keluhan berubah menjadi `TERVERIFIKASI` &rarr; Timestamp `completedAt` terisi &rarr; SLA dihitung resmi berbasis `completedAt`.
6. **Penerbitan Dokumen:** Admin menerbitkan dokumen kendali mutu FR.SM/TI/033.001 &rarr; Data keluhan dibekukan dalam `snapshotData` &rarr; Tiket terhubung permanen ke `documentId`.
7. **Buka Kembali (Reopen):** Permintaan reopen diajukan dengan alasan jelas &rarr; Admin menyetujui &rarr; Tiket kembali ke status `DALAM_PENANGANAN` dengan **retensi PIC yang sama**.

### B. Alur Penolakan & Revisi Lapangan (Rejection Loop) — [LULUS]
1. PIC mengajukan hasil penanganan (`MENUNGGU_VERIFIKASI`).
2. Verifikator memeriksa bukti fisik dan menolak karena bukti belum lengkap.
3. Alasan penolakan spesifik disimpan ke tabel `Verification` dengan `cycle: 1`.
4. Status tiket dikembalikan ke `DALAM_PENANGANAN`, sementara **penugasan PIC tidak berubah**.
5. Di dashboard PIC muncul notifikasi peringatan revisi beserta feedback verifikator.
6. PIC memperbaiki tindakan, mengunggah bukti baru, dan mengajukan ulang (`cycle: 2`).
7. Verifikator menyetujui siklus 2 &rarr; Seluruh histori siklus 1 dan 2 tetap tersimpan lengkap.

---

## 4. Pengujian Keamanan & Negatif

| Skenario Pengujian Negatif | Harapan Sistem | Hasil Aktual | Status |
|---|---|---|---|
| Admin mencoba memverifikasi keluhan | Ditolak oleh server (*Four-Eyes Principle*) | `isAllowed: false`, error dilempar | **LULUS** |
| PIC A mencoba mengubah keluhan milik PIC B | Ditolak (*Ownership Isolation*) | Ditolak di transaksi database | **LULUS** |
| Akses mutasi tanpa session aktif (null) | Ditolak dengan kode `UNAUTHENTICATED` | Mengembalikan status 401/error sesi | **LULUS** |
| Verifikator menolak tanpa mengisi feedback | Ditolak (*Validation Error*) | Ditolak sebelum transaksi dibuka | **LULUS** |
| Upload file non-gambar (misal `.exe` / `.sh`) | Ditolak via validasi *Magic Bytes* | HTTP 400 "Format tidak didukung" | **LULUS** |
| Upload file ukuran &gt; 5MB | Ditolak via validasi *Max File Size* | HTTP 400 "Ukuran file terlalu besar" | **LULUS** |
| Hapus keluhan yang sudah masuk dokumen terbit | Ditolak (*Integrity Protection*) | Ditolak karena `documentId` terisi | **LULUS** |
| Lompatan status ilegal (`BELUM` &rarr; `TERVERIFIKASI`) | Ditolak oleh State Machine | Transisi ditolak, status tetap aman | **LULUS** |

---

## 5. Uji Integritas Database & Penyimpanan

- **Relasi & Foreign Key Constraints:** Relasi antara `Complaint`, `User (PIC)`, `Verification (Verifier)`, `ReopenRequest`, `Document`, dan `AuditLog` terlindungi dengan referensial integritas Prisma/MySQL.
- **Transaksionalitas (`prisma.$transaction`):** Seluruh mutasi multi-langkah (seperti assign PIC + audit log, verifikasi + audit log, penerbitan dokumen + update tiket) dibungkus transaksi database ACID. Jika salah satu langkah gagal, seluruh perubahan di-rollback secara otomatis tanpa menyisakan relasi setengah jadi.
- **Penyimpanan Berkas (Cloudinary):** Berkas foto bukti disimpan dengan nama acak yang aman (*sanitized ID*) dan dioptimalkan otomatis (format webp, batas 2048px).

---

## 6. Bug yang Ditemukan dan Telah Diperbaiki

1. **Sinkronisasi Pelepasan Penugasan PIC oleh Admin:**
   - *Masalah:* Saat Admin mengosongkan PIC pada formulir edit, nilai string kosong sebelumnya tidak mengosongkan relasi PIC.
   - *Solusi:* Diperbaiki dengan mengirimkan nilai `picId: null` secara eksplisit ke fungsi `editComplaintDetails`.
2. **Validasi Panjang Input Client-Side:**
   - *Masalah:* Validasi client-side sebelumnya hanya memeriksa string kosong, sementara backend mewajibkan panjang minimum.
   - *Solusi:* Ditambahkan validasi min-length pada `ComplaintCreateModal` dan `ComplaintActionModal` agar selaras 100% dengan backend.
3. **Boundary Nilai Pagination:**
   - *Masalah:* Potensi `startIndex` bernilai negatif jika `validPage` bernilai 0 pada kondisi data kosong.
   - *Solusi:* Dibungkus dengan proteksi batas `Math.min(Math.max(1, currentPage), totalPages)`.
4. **Tipe Data targetHours Nullable:**
   - *Masalah:* Snapshot SLA dari database bertipe `number | null`, sedangkan opsi perhitungan mengharuskan `number | undefined`.
   - *Solusi:* Diperluas menjadi `targetHours?: number | null` pada `SlaCalculationOptions`.

---

## 7. Bug Terbuka & Keterbatasan Lingkungan Saat Ini

| Item | Kategori | Penjelasan & Rekomendasi |
|---|---|---|
| **Pembaruan Antarmuka Real-Time Tanpa Refresh** | Keterbatasan (Minor) | Saat ini sinkronisasi UI antar pengguna bergantung pada `router.refresh()` setelah aksi pengguna selesai. Belum menggunakan WebSocket/SSE. Disarankan untuk implementasi fitur notifikasi push pada pengembangan lanjutan. |
| **Penyimpanan Lokal untuk Bukti Offline** | Keterbatasan (Minor) | Upload berkas bergantung pada konektivitas Cloudinary. Jika koneksi internet terputus, unggahan bukti gagal. Disarankan mempertimbangkan penyimpanan lokal sementara (*offline fallback*) jika stasiun terpencil mengalami kendala internet. |

---

## 8. Panduan & Checklist Persiapan Deployment

### A. Environment Variables Wajib (`.env`)

Pastikan variabel lingkungan berikut telah dikonfigurasi pada server target sebelum menjalankan aplikasi:

```env
# 1. Database MySQL Produksi
DATABASE_URL="mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/spkp_kai"

# 2. NextAuth.js
NEXTAUTH_URL="https://spkp.kai.id"
NEXTAUTH_SECRET="<generate-menggunakan-openssl-rand-base64-32>"

# 3. Cloudinary CDN Storage
CLOUDINARY_CLOUD_NAME="<nama-cloud-produksi>"
CLOUDINARY_API_KEY="<api-key-produksi>"
CLOUDINARY_API_SECRET="<api-secret-produksi>"
```

### B. Urutan Langkah Deployment Staging / Produksi

1. **Pull Kode Sumber:**
   ```bash
   git checkout main (atau perbaikan)
   git pull origin main
   ```
2. **Instalasi Dependensi Bersih:**
   ```bash
   npm ci
   ```
3. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```
4. **Terapkan Migrasi Database (Tanpa Reset):**
   ```bash
   npx prisma migrate deploy
   ```
5. **Jalankan Seed Akun Pengguna Awal (Jika Database Baru):**
   ```bash
   npm run db:seed
   ```
6. **Kompilasi Bundel Produksi:**
   ```bash
   npm run build
   ```
7. **Jalankan Layanan Aplikasi:**
   ```bash
   npm run start
   ```

### C. Prosedur Backup & Pemulihan Database

- **Backup Otomatis:** Telah disediakan script `npm run db:backup` (`scripts/backup-db.ts`) untuk mencadangkan database MySQL ke format `.sql`.
- **Jadwal Rekomendasi:** Jalankan backup terjadwal (cron job) setiap hari pukul 01:00 WIB.

---

## 9. Kesimpulan & Rekomendasi Rilis

Berdasarkan seluruh hasil pengujian faktual:
1. **Integritas Bisnis:** Alur kerja registrasi, penugasan, penanganan teknis, verifikasi independen, dokumen audit, dan pembukaan kembali telah terverifikasi bekerja sesuai aturan SOP KAI.
2. **Kualitas Kode & Stabilitas:** Lulus uji linting, type-checking, 84 pengujian otomatis, dan production build tanpa error.
3. **Keamanan:** Prinsip pemisahan wewenang (*Separation of Duties*) dan prinsip kendali ganda (*Four-Eyes Principle*) terisolasi secara kokoh di lapisan backend.

**Rekomendasi:**  
Aplikasi SPKP dinyatakan **LULUS PENGUJIAN AKHIR** dan siap dilanjutkan ke tahap deployment staging/produksi.
