# LAPORAN PENGUJIAN AKHIR, REGRESI, DAN KESIAPAN SISTEM SPKP KAI
**Sistem Penanganan Keluhan Pelanggan (SPKP) — PT Kereta Api Indonesia (Persero)**  
**Standar Pengendalian Mutu Internal: FR.SM/TI/033.001**

> **Tanggal Pelaksanaan:** 20 Oktober 2026  
> **Peran:** QA Engineer & Release Engineer  
> **Branch Git:** `perbaikan`  
> **Status Keseluruhan Sistem:** **LULUS PENGUJIAN REGRESI MENYELURUH (100% GREEN) — SIAP OPERASIONAL**

---

## 1. Ringkasan Eksekutif

Audit akhir dan pengujian regresi menyeluruh telah dijalankan pada aplikasi SPKP setelah implementasi serangkaian perbaikan arsitektural:
1. **Penghapusan Menyeluruh Fitur SLA:** Bebas ketergantungan dari seluruh kode, model database, metrik overview, badge, filter, dan utility.
2. **Kekebalan Arsip Dokumen KAI (Immutable Snapshot):** Dokumen terbit menyimpan salinan beku data keluhan dalam format JSON (`snapshotData`), mendukung penomoran revisi dokumen, serta pencetakan (Print) dan pengunduhan PDF langsung tanpa memicu penerbitan baru.
3. **Penyeragaman Fitur Ekspor Excel:** Format tabel profesional selaras standar KAI di seluruh role (Admin, PIC, Verifikator) dengan data tersaring kontekstual.
4. **Penguatan Hak Akses PIC & Pencegahan Self-Approval Reopen:** Menghapus superuser override Admin pada progres PIC (*Separation of Duties*) dan menegakkan *Four-Eyes Principle* pada permohonan pembukaan kembali keluhan (*Self-Approval Prevention*).

---

## 2. Rekapitulasi Status Pemeriksaan Kualitas & Regresi

| Kategori Pengujian / Pemeriksaan | Perintah / Alat Uji | Target / Lingkup | Hasil Aktual | Keterangan |
|---|---|---|---|---|
| **Pemeriksaan Tipe TypeScript** | `npx tsc --noEmit` | Seluruh Modul Proyek | **LULUS (0 Error)** | Strict mode type-checking 100% aman. |
| **Pemeriksaan Kualitas Kode (ESLint)** | `npm run lint` (`next lint`) | Seluruh Direktori | **LULUS (0 Warning / 0 Error)** | Standar kode Next.js & React terpenuhi. |
| **Unit & Integration Tests (Vitest)** | `npm test` (`vitest run`) | 8 File Test Suites | **LULUS (127/127 Tests - 100%)** | Seluruh skenario logika bisnis sukses. |
| **Kompilasi Bundel Produksi** | `npm run build` (`next build`) | 7 Rute Halaman Aplikasi | **LULUS (Exit Code 0)** | Halaman statis & dinamis ter-generate sempurna. |
| **Verifikasi Penghapusan SLA** | Audit Kode & Skema Prisma | Seluruh Repository | **LULUS (0 Dependensi)** | Tidak ada import aktif, model, atau kalkulasi SLA. |
| **Pemisahan Peran (Separation of Duties)** | Test Suite Otorisasi | Admin vs PIC vs Verifikator | **LULUS** | Admin tidak bisa eksekusi tugas PIC; Verifikator independen. |
| **Pencegahan Self-Approval Reopen** | Test Suite RBAC & Transaksi | Alur Peninjauan Reopen | **LULUS** | Pemohon dilarang menyetujui permohonannya sendiri. |
| **Imutabilitas Dokumen Arsip** | Test Suite Snapshot | Dokumen FR.SM/TI/033.001 | **LULUS** | Snapshot beku tidak berubah saat data aktif dimutasi. |
| **Print & Download PDF Mandiri** | UI Modal & React-PDF | Komponen Dokumen KAI | **LULUS** | Print & Download PDF tanpa penerbitan dokumen baru. |
| **Ekspor Excel Seragam** | Modul `exportExcel.ts` | Admin, PIC, Verifikator | **LULUS** | Layout tabel KAI seragam, filter data otomatis. |

---

## 3. Rincian Hasil Pengujian Test Suite (127 Tests)

Pengujian otomatis dijalankan menggunakan test runner **Vitest** dengan rincian hasil aktual:

```text
 ✓ tests/validation.test.ts (13 tests) 24ms
 ✓ tests/auth_rbac.test.ts (14 tests) 14ms
 ✓ tests/ui_dashboard_phase6.test.ts (9 tests) 15ms
 ✓ tests/kai_document_print_pdf.test.ts (18 tests) 34ms
 ✓ tests/backend_state_machine.test.ts (20 tests) 23ms
 ✓ tests/fase4_rbac_reopen.test.ts (35 tests) 29ms
 ✓ tests/e2e_security_release.test.ts (13 tests) 26ms
 ✓ tests/complaintNumber.test.ts (5 tests) 10ms

 Test Files  8 passed (8)
      Tests  127 passed (127)
   Duration  1.73s
```

### Rincian Per Test File:

1. **`tests/fase4_rbac_reopen.test.ts` (35 Skenario — LULUS):**
   - PIC hanya berwenang mengubah keluhan yang ditugaskan kepadanya.
   - PIC tidak dapat mengubah progres keluhan milik PIC lain (*Ownership Isolation*).
   - Admin ditolak saat mencoba menyimpan progres penanganan atau upload bukti atas nama PIC (*Separation of Duties*).
   - Verifikator ditolak saat mencoba melakukan tindakan teknis PIC.
   - Admin/Verifikator mengajukan reopen keluhan yang telah terverifikasi.
   - Pemohon reopen dilarang menyetujui atau menolak permohonannya sendiri (*Self-Approval Prevention*).
   - Peninjauan reopen yang disetujui: status bertransisi ke `DALAM_PENANGANAN`, `completedAt` direset, penugasan PIC tetap sama.
   - Peninjauan reopen yang ditolak: status tetap `TERVERIFIKASI`, alasan penolakan tersimpan.
   - Proteksi konkurensi atomik: dua Admin tidak dapat memproses permohonan reopen yang sama secara bersamaan.

2. **`tests/backend_state_machine.test.ts` (20 Skenario — LULUS):**
   - Transisi legal: `BELUM_DITANGANI` &rarr; `DALAM_PENANGANAN` &rarr; `MENUNGGU_VERIFIKASI` &rarr; `TERVERIFIKASI`.
   - Transisi penolakan mutu: `MENUNGGU_VERIFIKASI` &rarr; `DALAM_PENANGANAN` dengan retensi PIC.
   - Penolakan lompatan status ilegal (*Invalid Transition Guard*).

3. **`tests/kai_document_print_pdf.test.ts` (18 Skenario — LULUS):**
   - Pembekuan snapshot JSON keluhan pada saat dokumen diterbitkan (*Immutable Snapshot*).
   - Mutasi data keluhan aktif setelah terbit tidak mengubah isi snapshot dokumen lama.
   - Pencetakan (Print) dan pengunduhan PDF membaca langsung dari data snapshot tanpa membuat baris dokumen baru di database.
   - Rantai revisi dokumen (`revisionNumber` dan `parentDocumentId`).

4. **`tests/auth_rbac.test.ts` (14 Skenario — LULUS):**
   - Hak akses pembuatan keluhan khusus Admin.
   - Penolakan Admin mengeksekusi penanganan PIC (menegaskan aturan baru tanpa superuser override).
   - Wewenang eksklusif Verifikator untuk menyetujui/menolak penanganan.

5. **`tests/validation.test.ts` (13 Skenario — LULUS):**
   - Validasi batas karakter nama pelapor, uraian masalah, saluran KAI resmi, tindakan perbaikan & pencegahan, serta alasan penolakan/reopen.

6. **`tests/e2e_security_release.test.ts` (13 Skenario — LULUS):**
   - Siklus komprehensif alur keluhan end-to-end.
   - Penolakan akses tanpa autentikasi (*Session Guard*).
   - Integritas nomor keluhan KAI (`CMP-YYYY-XXXX`).

7. **`tests/ui_dashboard_phase6.test.ts` (9 Skenario — LULUS):**
   - Logika pemfilteran dashboard operasional (semua tiket, tugas saya, menunggu verifikasi).
   - Metrik ringkasan keluhan tanpa dependensi SLA.

8. **`tests/complaintNumber.test.ts` (5 Skenario — LULUS):**
   - Keunikan format penomoran registrasi, parsing urutan tahunan, dan penanganan urutan baru.

---

## 4. Bukti Kesiapan Kompilasi Produksi (Next.js Build)

Perintah `npm run build` dieksekusi dan menghasilkan bundel produksi yang valid:

```text
Route (app)                              Size     First Load JS
┌ ○ /                                    138 B          87.6 kB
├ ○ /_not-found                          873 B          88.4 kB
├ ƒ /api/auth/[...nextauth]              0 B                0 B
├ ƒ /api/upload                          0 B                0 B
├ ƒ /dashboard                           121 kB          223 kB
└ ○ /login                               1.77 kB         104 kB
+ First Load JS shared by all            87.5 kB

ƒ Middleware                             50.3 kB
```

- Kompilasi berhasil tanpa peringatan ESLint atau TypeScript compiler error.
- Seluruh rute aman dan terproteksi middleware otentikasi NextAuth.js.

---

## 5. Dokumentasi yang Diperbarui dan Dihapus

1. **Dihapus:**
   - `docs/aturan-sla.md`: Dihapus secara permanen dari repository karena fitur SLA telah dihapus menyeluruh.
2. **Diperbarui:**
   - `README.md`: Dihapus seluruh referensi SLA, diperbarui pohon struktur direktori, dan diselaraskan perintah seed.
   - `PRD.md`: Dihapus klausul SLA pada modul PIC & ekspor, diganti dengan aturan pemisahan tugas PIC dan ekspor KAI seragam.
   - `docs/aturan-bisnis.md`: Diperbarui menjadi 5 pilar keputusan bisnis, diselaraskan matriks keselarasan kode aktual, dan dituntaskan seluruh tindak lanjut.
   - `docs/matriks-hak-akses.md`: Dihapus superuser override Admin pada penanganan PIC, ditegakkan *Four-Eyes Principle* dan *Self-Approval Prevention* pada reopen, serta dicantumkan ekspor Excel seragam.
   - `docs/state-machine.md`: Diperbarui diagram FSM, diperketat guard transisi T-2 (khusus PIC), T-7 & T-8 (pencegahan self-approval Admin), dan penambahan larangan transisi ilegal.
   - `docs/arsitektur-skema-database.md`: Dihapus model `SlaPolicy` dan kolom SLA, ditambahkan model counter atomik, dan didokumentasikan snapshot JSON dokumen.
   - `docs/laporan-pengujian-akhir.md`: Laporan komprehensif regresi terkini (127/127 tests passing).

---

## 6. Risiko Operasional & Rekomendasi Pengujian Manual

| Item Operasional | Risiko Potensial | Rekomendasi Mitigasi |
|---|---|---|
| **Konektivitas Cloudinary CDN** | Gagal unggah foto jika koneksi internet terputus saat di lapangan. | Pastikan jaringan internet di lokasi kerja staf stabil saat melampirkan foto bukti fisik perbaikan. |
| **Cetak PDF pada Peramban Tertentu** | Perbedaan rendering dialog print bawaan browser (Chrome vs Firefox vs Safari). | Gunakan tombol "Unduh PDF" sebagai opsi utama jika dialog cetak peramban mengalami kendala layout. |
| **Rotasi Admin Peninjau Reopen** | Jika sistem hanya memiliki 1 akun Admin aktif, permohonan reopen yang dibuat oleh Admin tersebut tidak dapat disetujui sendiri (*Self-Approval Prevention*). | Pastikan unit kerja memiliki minimal 2 staf Admin terdaftar agar alur *Four-Eyes Principle* pada permohonan reopen berjalan lancar. |

---

## 7. Kesimpulan Akhir

Aplikasi **SPKP (Sistem Penanganan Keluhan Pelanggan) PT Kereta Api Indonesia (Persero)** telah sukses melewati seluruh tahapan audit akhir dan pengujian regresi. 

Seluruh 127 pengujian otomatis lulus 100%, kompilasi TypeScript dan linting bersih tanpa error, bundel produksi ter-compile sempurna, dan seluruh dokumentasi teknis telah sinkron dengan implementasi aktual kode sumber. Sistem dinyatakan **SELESAI DAN SIAP DIGUNAKAN**.
