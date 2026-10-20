# Spesifikasi Aturan Bisnis — SPKP (Sistem Penanganan Keluhan Pelanggan)
**PT Kereta Api Indonesia (Persero)**> **Versi Dokumen:** 3.0.0-Final  
> **Status:** Spesifikasi Aturan Bisnis Resmi (Disinkronkan)  
> **Tanggal:** 2026-10-20  
> **Referensi Utama:** SOP Pelayanan Keluhan KAI, Format FR.SM/TI/033.001, Kebijakan Tanpa SLA

---

## 1. Latar Belakang & Ruang Lingkup

Sistem Penanganan Keluhan Pelanggan (SPKP) adalah aplikasi operasional internal PT Kereta Api Indonesia (Persero) untuk meregistrasi, menugaskan, menindaklanjuti, memverifikasi, dan mengarsipkan seluruh keluhan penumpang dari berbagai saluran layanan (Access by KAI, Contact Center 121, Media Sosial, Loket/Stasiun, Email).

Keputusan manajemen KAI menetapkan bahwa **SPKP tidak lagi menggunakan Service Level Agreement (SLA)** untuk mengukur batas waktu respon, keterlambatan, prioritas, atau kepatuhan. Penanganan difokuskan secara murni pada integritas data, mutu penyelesaian fisik, bukti lapangan, akuntabilitas peran, dan arsip dokumen resmi.

---

## 2. Lima Pilar Keputusan Bisnis Pokok (Ground Truth)

Berikut adalah 5 pilar keputusan bisnis yang menjadi batasan mutlak (*invariants*):

1. **Keluhan Dianggap Selesai Hanya Jika Disetujui Verifikator (*Four-Eyes Principle*):**
   Penanganan PIC yang telah selesai tidak otomatis mengubah status keluhan menjadi selesai. Keluhan resmi berstatus selesai (*resolved*) hanya ketika Verifikator Mutu independen memberikan persetujuan (*APPROVED*). Admin dilarang keras melakukan verifikasi mutu penanganan.
2. **Penolakan Verifikasi Mengembalikan Keluhan ke PIC yang Sama (*Rejection Loop*):**
   Jika hasil penanganan dinilai belum memadai (*REJECTED*), status keluhan kembali ke `DALAM_PENANGANAN` dan secara otomatis tetap menjadi tanggung jawab petugas PIC yang sama untuk perbaikan lanjutan.
3. **Pemisahan Peran & Tanggung Jawab (*Separation of Duties*):**
   - PIC hanya dapat mengeksekusi keluhan yang ditugaskan kepada dirinya (`picId === user.id`).
   - Admin tidak diperbolehkan menyimpan progres tindakan perbaikan atau mengajukan verifikasi atas nama PIC.
4. **Kekebalan Arsip Dokumen Penerbitan (*Immutable Snapshot*):**
   Dokumen rekapitulasi keluhan (format `FR.SM/TI/033.001`) yang telah diterbitkan dikunci permanen sebagai arsip hukum/audit dalam kolom `snapshotData` (JSON). Segala bentuk perubahan data keluhan di kemudian hari tidak mengubah rekaman arsip dokumen masa lalu. Dokumen dapat dicetak (Print) dan diunduh PDF kapan saja tanpa menerbitkan dokumen baru. Koreksi dilakukan melalui mekanisme **Revisi Dokumen Baru** bertingkat.
5. **Pembukaan Kembali Keluhan (*Reopen*) Terkontrol & Bebas *Self-Approval*:**
   Keluhan yang sudah berstatus `TERVERIFIKASI` dapat diajukan untuk dibuka kembali oleh Admin atau Verifikator. Persetujuan/penolakan permohonan reopen dilakukan oleh Admin, dengan syarat ketat: **pemohon dilarang menyetujui atau menolak permohonannya sendiri** (*Self-Approval Prevention*).

---

## 3. Matriks Keselarasan Kode Aktual (Compliance Matrix)

| No | Aspek Bisnis | Status Implementasi Aktual | Mekanisme Penegakan |
|:---|:---|:---|:---|
| **C-1** | **Penghapusan Menyeluruh SLA** | **Tuntas 100%** | Seluruh model SLA, target durasi, filter SLA, metrik overdue, dan utility perhitungan telah dihapus dari kode, basis data, dan UI. |
| **C-2** | **Penyelesaian Keluhan** | **Tuntas 100%** | `verifyComplaint` mengubah status ke `TERVERIFIKASI` saat `APPROVED`. Transisi bypass ditolak di FSM dan Server Action. |
| **C-3** | **Penolakan PIC** | **Tuntas 100%** | `verifyComplaint` mengubah status ke `DALAM_PENANGANAN` tanpa mengubah `picId`. Rekaman feedback tersimpan di tabel `Verification`. |
| **C-4** | **Hak Verifikasi** | **Tuntas 100%** | Guard `user.role === Role.VERIFIKATOR` ditegakkan di `permissions.ts`, `state-machine.ts`, dan `complaints.ts`. |
| **C-5** | **Arsip Dokumen Kebal Ubah** | **Tuntas 100%** | Penerbitan menyimpan salinan `snapshotData` JSON mandiri pada tabel `Document`. Modal cetak & PDF membaca snapshot tanpa mengubah state database. |
| **C-6** | **Pembukaan Kembali (Reopen)** | **Tuntas 100%** | Entitas `ReopenRequest` terpisah, transisi FSM terkontrol, pencegahan *self-approval*, dan penguncian status PENDING atomik. | |

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

## 5. Status Finalisasi Kebijakan Sistem

Seluruh parameter operasional telah ditetapkan dan diimplementasikan secara definitif:
1. **Kebijakan SLA:** Dihapus sepenuhnya dari sistem berdasarkan keputusan final manajemen KAI.
2. **Pengajuan Reopen:** Diberikan kepada role `ADMIN` dan `VERIFIKATOR`.
3. **Persetujuan Reopen:** Eksklusif bagi role `ADMIN` dengan penegakan *Four-Eyes Principle* (Admin pemohon dilarang menyetujui permohonannya sendiri).
4. **Penerbitan & Arsip Dokumen:** Format resmi KAI `FR.SM/TI/033.001` dengan snapshot JSON beku, dukungan Print & Download PDF tanpa re-publish, dan rantai revisi dokumen.
5. **Penyeragaman Ekspor Excel:** Format spreadsheet seragam berbasis format resmi KAI di semua role dengan filter kontekstual.
