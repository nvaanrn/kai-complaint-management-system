# Spesifikasi Aturan Bisnis — SPKP (Sistem Penanganan Keluhan Pelanggan)
**PT Kereta Api Indonesia (Persero)**

> **Versi Dokumen:** 1.0.0-Fase2  
> **Status:** Draft Arsitektur & Analisis Bisnis  
> **Tanggal:** 2026-10-10  
> **Referensi Utama:** Hasil Audit Fase 1, SOP Pelayanan Keluhan KAI, Format FR.SM/TI/033.001

---

## 1. Latar Belakang & Ruang Lingkup

Sistem Penanganan Keluhan Pelanggan (SPKP) adalah aplikasi operasional internal PT Kereta Api Indonesia (Persero) untuk meregistrasi, menugaskan, menindaklanjuti, memverifikasi, dan mengarsipkan seluruh keluhan penumpang dari berbagai saluran layanan (Access by KAI, Contact Center 121, Media Sosial, Loket/Stasiun, Email).

Dokumen ini memformalkan aturan bisnis menjadi spesifikasi sistematis yang siap ditransformasikan ke skema database, server actions, state machine, dan antarmuka pengguna pada fase implementasi teknis berikutnya.

---

## 2. Enam Keputusan Bisnis Pokok (Ground Truth)

Berikut adalah 6 pilar keputusan bisnis yang telah disepakati dan menjadi batasan absolut (*invariants*):

1. **Target SLA Berbeda Sesuai Jenis Keluhan:**
   Target waktu penyelesaian keluhan tidak lagi seragam 24 jam, melainkan ditentukan secara spesifik berdasarkan klasifikasi/jenis keluhan pelanggan.
2. **Keluhan Dianggap Selesai Hanya Jika Disetujui Verifikator:**
   Penanganan PIC yang telah selesai tidak otomatis mengubah status keluhan menjadi selesai. Keluhan resmi berstatus selesai (*resolved*) hanya ketika Verifikator Mutu memberikan persetujuan (*APPROVED*).
3. **Penolakan Verifikasi Mengembalikan Keluhan ke PIC yang Sama:**
   Jika hasil penanganan dinilai belum memadai (*REJECTED*), status keluhan kembali ke penanganan aktif dan secara otomatis tetap menjadi tanggung jawab petugas PIC yang sama untuk perbaikan lanjutan.
4. **Prinsip Empat Mata (Four-Eyes Principle) pada Verifikasi:**
   Admin dilarang keras melakukan verifikasi keluhan. Wewenang menyetujui atau menolak hasil penanganan hanya dimiliki oleh peran independen, yaitu **VERIFIKATOR**.
5. **Kekebalan Arsip Dokumen Penerbitan (Immutable Snapshot):**
   Dokumen rekapitulasi keluhan (format `FR.SM/TI/033.001`) yang telah diterbitkan dikunci permanen sebagai arsip hukum/audit. Segala bentuk perubahan data keluhan di kemudian hari tidak boleh mengubah rekaman arsip dokumen masa lalu.
6. **Pembukaan Kembali Keluhan (Reopen) Terkontrol:**
   Keluhan yang sudah berstatus terverifikasi (`TERVERIFIKASI`) dimungkinkan untuk dibuka kembali hanya jika diajukan secara resmi dan disetujui oleh **ADMIN**.

---

## 3. Gap Analysis: Kode Aktual vs Keputusan Bisnis

Berdasarkan audit teknis mendalam terhadap kode aktual proyek, ditemukan kesenjangan (*gaps*) antara implementasi saat ini dengan keputusan bisnis:

| No | Aspek Bisnis | Kondisi Kode Aktual | Kesenjangan / Gap | Dampak & Kebutuhan Fase Berikutnya |
|:---|:---|:---|:---|:---|
| **G-1** | **Target SLA** | `src/lib/sla.ts` menerapkan target *hardcoded* default 24 jam untuk semua keluhan tanpa membedakan tipe. | Model `Complaint` belum memiliki kolom `category` / `type` (hanya ada kolom `source`). | Perlu penambahan kolom kategori keluhan pada skema dan matriks konfigurasi SLA per kategori. |
| **G-2** | **Penyelesaian Keluhan** | `verifyComplaint` mengubah status ke `TERVERIFIKASI` saat disetujui. | Sudah selaras dengan Keputusan #2. | Menjaga agar tidak ada aksi client yang dapat melompati verifikasi. |
| **G-3** | **Penolakan PIC** | `verifyComplaint` mengubah status ke `DALAM_PENANGANAN` tanpa mengubah `picId`. | Sudah selaras dengan Keputusan #3, namun belum ada pencatatan siklus putaran perbaikan (*rework iteration count*). | Perlu pencatatan histori penolakan yang terstruktur agar pelaporan rework terukur. |
| **G-4** | **Hak Verifikasi** | Guard `user.role === Role.VERIFIKATOR` sudah ditegakkan di `permissions.ts` dan `complaints.ts`. | Sudah selaras dengan Keputusan #4. | UI dan server sudah sinkron. |
| **G-5** | **Arsip Dokumen** | `createDocumentBatch` hanya mengaitkan `documentId` pada baris tabel `Complaint` secara relasional langsung (*live relation*). | **Kritis:** Jika data keluhan di-update atau PIC diganti, isi dokumen ikut berubah secara dinamis. Tidak ada salinan data historis (*data snapshot/JSON blob*). | Perlu mekanisme *immutable snapshot* (misal: JSON payload tersimpan di tabel `Document` atau tabel pivot `DocumentItemSnapshot`). |
| **G-6** | **Pembukaan Kembali (Reopen)** | Belum ada model data, enum status, maupun Server Action untuk menangani permintaan *reopen*. | Fitur pembukaan kembali belum tersedia sama sekali di basis kode. | Perlu perancangan arsitektur data untuk entitas `ReopenRequest` atau status transisi khusus. |

---

## 4. Spesifikasi Aturan Alur Operasional

### 4.1 Registrasi Keluhan Baru
* **Wewenang:** Hanya role **ADMIN**.
* **Prasyarat & Validasi:**
  * Nama pelapor (`customerName`): Wajib diisi, minimal 3 karakter.
  * Uraian keluhan (`description`): Wajib diisi, minimal 10 karakter.
  * Saluran pelaporan (`source`): Wajib dipilih dari daftar resmi (`Access by KAI`, `Contact Center 121`, `Media Sosial`, `Petugas Stasiun / Loket`, `Email Resmi KAI`, `Lainnya`).
  * Tanggal kejadian/pelaporan (`date`): Wajib diisi (default saat ini).
  * Penugasan PIC awal (`picId`): Opsional saat registrasi awal.
* **Penetapan Status Otomatis:**
  * Jika `picId` belum diisi: status bernilai `BELUM_DITANGANI`.
  * Jika `picId` langsung ditentukan: status bernilai `DALAM_PENANGANAN`.
* **Penomoran Unik:** Sistem secara otomatis membangkitkan nomor registrasi standar KAI dengan format `CMP-YYYY-XXXX` (contoh: `CMP-2026-0001`).

### 4.2 Penugasan & Pergantian PIC
* **Wewenang:** Hanya role **ADMIN**.
* **Aturan Pergantian:**
  * Admin dapat menugaskan PIC atau mengganti PIC pada keluhan yang berstatus `BELUM_DITANGANI` atau `DALAM_PENANGANAN`.
  * Pergantian PIC dilarang jika keluhan sedang dalam status `MENUNGGU_VERIFIKASI` atau `TERVERIFIKASI` (kecuali setelah disetujui *reopen*).

### 4.3 Pelaksanaan & Penanganan oleh PIC
* **Wewenang:** Khusus role **PIC** yang ditugaskan pada keluhan tersebut (`complaint.picId === user.id`).
* **Mode Simpan Draf (*Work in Progress*):**
  * PIC dapat menyimpan kemajuan sementara tindakan perbaikan/pencegahan tanpa mengubah status keluhan dari `DALAM_PENANGANAN`.
* **Pengajuan Verifikasi (*Submit for Verification*):**
  * Syarat mutlak pengajuan:
    1. Tindakan Perbaikan (*Corrective Action*) wajib diisi (minimal 10 karakter).
    2. Tindakan Pencegahan (*Preventive Action*) wajib diisi (minimal 10 karakter).
    3. Foto Bukti Pelaksanaan di lapangan (`proofImageUrl`) wajib diunggah (tersimpan aman di Cloudinary).
  * Efek sistem: Status berpindah ke `MENUNGGU_VERIFIKASI` dan timestamp `submittedAt` direkam secara instan.

### 4.4 Verifikasi Mutu & Integritas Penanganan
* **Wewenang:** Mutlak role **VERIFIKATOR**.
* **Keputusan Verifikator:**
  * **Setuju (APPROVED):**
    * Verifikator wajib menginput kesimpulan hasil verifikasi.
    * Status keluhan berpindah ke `TERVERIFIKASI`.
    * Rekaman riwayat disimpan di tabel `Verification` (hasil, catatan, verifikator, timestamp).
  * **Tolak (REJECTED):**
    * Verifikator wajib menginput alasan penolakan secara spesifik.
    * Status keluhan dikembalikan ke `DALAM_PENANGANAN`.
    * Petugas PIC tetap sama (`picId` tidak berubah).
    * Rekaman riwayat penolakan disimpan di tabel `Verification`.

### 4.5 Penerbitan & Penguncian Dokumen Arsip (FR.SM/TI/033.001)
* **Wewenang:** Role **ADMIN** (disahkan bersama *Management Representative*).
* **Kriteria Keluhan yang Berhak Diterbitkan:**
  * Keluhan **harus berstatus `TERVERIFIKASI`**. Keluhan yang belum selesai/belum diverifikasi tidak boleh masuk ke rekapitulasi audit resmi.
* **Aturan Penguncian Arsip (Snapshot Immutability):**
  * Saat dokumen dibuat, sistem merekam *snapshot* kondisi data pada detik tersebut (identitas pelapor, uraian, PIC, tindakan perbaikan, tindakan pencegahan, url foto, verifikator, tanggal verifikasi).
  * Apabila data keluhan di sistem mengalami pembaruan di masa mendatang (misalnya akibat pembukaan kembali), data snapshot dalam berkas dokumen tidak boleh berubah.
  * Koreksi terhadap dokumen fisik yang sudah terbit diatur dengan mekanisme **Revisi Dokumen Baru** (peningkatan nomor versi dokumen: contoh `002-2020` menjadi `003-2026`).

### 4.6 Siklus Pembukaan Kembali Keluhan (Reopen Lifecycle)
* **Kondisi Awal:** Keluhan telah berstatus `TERVERIFIKASI`.
* **Kebutuhan Bisnis:**
  * Keluhan yang dibuka kembali membutuhkan justifikasi kuat (misalnya: penumpang komplain ulang karena masalah kambuh, temuan audit mutu, atau ketidaksesuaian hasil lapangan).
* **Alur Permohonan & Keputusan:**
  1. Pemohon mengajukan permintaan pembukaan kembali dengan menyertakan alasan rinci.
  2. Sistem menampung permintaan dalam status peninjauan permohonan.
  3. **ADMIN** meninjau permintaan:
     * **Disetujui Admin:** Status keluhan kembali ke `DALAM_PENANGANAN`, default ditugaskan ke PIC sebelumnya (atau Admin dapat memilih menugaskan PIC baru), dan catatan pembukaan kembali dicatat dalam audit trail.
     * **Ditolak Admin:** Status keluhan tetap `TERVERIFIKASI`, alasan penolakan dicatat, dan riwayat audit diperbarui.

---

## 5. Ringkasan Kebutuhan Tindak Lanjut

Sebelum implementasi teknis dilakukan, keputusan mendetail terkait parameter berikut perlu difinalisasi bersama Product Owner/User:
1. Daftar kategori/jenis keluhan resmi beserta target SLA-nya.
2. Kebijakan jam operasional SLA (jam kalender 24/7 vs jam kerja operasional).
3. Titik hitung awal SLA (apakah dari tanggal kejadian tiket vs waktu registrasi sistem).
4. Penentuan siapa saja role yang berhak mengajukan permohonan pembukaan kembali (Reopen).
