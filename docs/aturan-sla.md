# Spesifikasi Aturan Perhitungan Service Level Agreement (SLA)
**PT Kereta Api Indonesia (Persero)**

> **Versi Dokumen:** 1.0.0-Fase2 (DIARSIPKAN / OBSOLETE)  
> **Status:** FITUR DIHAPUS MENYELURUH PADA FASE 1  
> **Dasar Keputusan:** Keputusan Final Manajemen — Sistem tidak lagi menggunakan SLA untuk mengukur target waktu, keterlambatan, prioritas, atau kepatuhan.

> [!WARNING]
> **FITUR SLA TELAH DIHAPUS SECARA MENYELURUH (FASE 1)**  
> Fitur Service Level Agreement (SLA) beserta seluruh model database, komponen UI, metrik overview, badge, filter, dan utility perhitungannya telah dihapus dari aplikasi SPKP. Seluruh alur bisnis keluhan (penugasan PIC, tindakan perbaikan, verifikasi independen dua tahap, pembukaan kembali, audit log, dan dokumen arsip FR.SM/TI/033.001) tetap berjalan normal tanpa pembatasan durasi SLA. Dokumen ini dipertahankan murni sebagai arsip historis.

---

## 1. Latar Belakang & Prinsip Penghitungan SLA

Dalam implementasi awal SPKP, perhitungan SLA pada modul `src/lib/sla.ts` menggunakan satu target seragam yaitu **24 jam kalender**.

Sesuai **Keputusan Bisnis #1**, target SLA harus disesuaikan dengan **Jenis / Kategori Keluhan Pelanggan**. Keluhan yang berkaitan dengan keselamatan, kenyamanan darurat di perjalanan kereta api memiliki urgensi respon berbeda dibanding keluhan administrasi akun atau saran pelayanan umum.

Dokumen ini mendefinisikan kerangka konfigurasi SLA, komponen titik awal dan titik akhir waktu, pembedaan metrik SLA PIC vs SLA Verifikator, serta tabel rekomendasi target SLA yang menunggu persetujuan resmi.

---

## 2. Parameter Kunci Perhitungan SLA

### 2.1 Titik Awal Perhitungan (SLA Start Point)
Terdapat dua kandidat titik awal waktu:
* **Opsi A (Waktu Pelaporan Tiket - `complaint.date`):**
  Menggunakan waktu kejadian atau saat penumpang pertama kali menghubungi saluran (Contact Center / Access by KAI).
  * *Kelebihan:* Mengukur pengalaman nyata penumpang (*customer perspective*).
  * *Kelemahan:* Jika ada keluhan yang terlambat diinput oleh admin loket, SLA bisa langsung berada dalam kondisi kritis sebelum ditugaskan ke PIC.
* **Opsi B (Waktu Registrasi Sistem - `complaint.createdAt`) — (Rekomendasi Utama):**
  Menggunakan timestamp saat keluhan resmi masuk ke dalam basis data SPKP.
  * *Kelebihan:* Mengukur kinerja respons internal sistem dan operasional KAI sejak data diterima secara sah.
* **Opsi C (Waktu Penugasan PIC - `complaint.assignedAt`):**
  SLA baru berjalan saat PIC telah ditunjuk oleh Admin.

> **Rekomendasi Analis:** Gunakan **Opsi B (`createdAt`)** sebagai titik awal SLA Total Sistem, atau kombinasi di mana SLA Penanganan PIC dihitung sejak waktu penugasan PIC.

---

### 2.2 Titik Akhir Perhitungan (SLA End Point)
Untuk menciptakan akuntabilitas yang adil antar unit kerja, sistem merekomendasikan pemisahan dua metrik SLA:

1. **SLA Eksekusi PIC (Response / Resolution Time):**
   * **Titik Awal:** Saat PIC ditugaskan atau status menjadi `DALAM_PENANGANAN`.
   * **Titik Akhir:** Saat PIC mengunggah bukti dan mengajukan verifikasi (`complaint.submittedAt`).
   * *Tujuan:* Mengukur ketepatan waktu kerja tim teknis di lapangan tanpa terpengaruh antrean verifikasi.
2. **SLA Total Pelayanan (End-to-End SLA):**
   * **Titik Awal:** Waktu pencatatan keluhan (`createdAt`).
   * **Titik Akhir:** Saat Verifikator menyetujui penanganan (`Verification.verifiedAt` dengan `result = APPROVED`).
   * *Tujuan:* Pelaporan pemenuhan standar pelayanan prima KAI secara komprehensif kepada manajemen.

---

### 2.3 Kalender Waktu (Time Calendar)
KAI melayani mobilitas masyarakat selama 24 jam sehari, 7 hari seminggu. Namun, sebagian unit kantor administrasi bekerja pada hari dan jam kerja standar.
* **Jam Kalender (24/7 Continuous):** Jam dihitung tanpa henti sepanjang hari kalender, termasuk hari Sabtu, Minggu, dan libur nasional. Wajib digunakan untuk insiden operasional kereta api dan pelayanan stasiun.
* **Jam Kerja (Business Hours):** Dihitung hanya pada hari kerja (Senin–Jumat, pukul 08.00–17.00 WIB). Cocok untuk keluhan administratif (misal: restitusi pembatalan tiket perbankan, perbaikan data akun member).

---

### 2.4 Kebijakan Jeda SLA (SLA Pause / Clock Stop Policy)
Apakah jam SLA dihentikan pada kondisi tertentu?
* **Kasus Penolakan Verifikasi (Rework):**
  * *Opsi 1 (Jam Terus Berjalan):* Jam SLA tidak di-reset saat verifikator menolak (*REJECTED*), sehingga jika penanganan awal buruk, keluhan berisiko overdue. Ini mendorong kualitas penanganan pertama (*First-Time Right*).
  * *Opsi 2 (SLA Pause saat Review):* Waktu selama menunggu keputusan Verifikator tidak dihitung sebagai beban keterlambatan PIC.
* **Kasus Menunggu Informasi Pelapor:**
  * Jika diperlukan konfirmasi tambahan dari penumpang (misal: nomor rekening untuk restitusi), apakah SLA dijeda? *(Memerlukan konfirmasi pengguna).*

---

## 3. Matriks Konfigurasi Target SLA per Jenis Keluhan (Rancangan Rekomendasi)

Tabel berikut menyajikan pemetaan rekomendasi kategori keluhan di lingkungan KAI beserta usulan target durasinya yang **memerlukan konfirmasi & persetujuan Product Owner/Pengguna**:

| No | Kategori / Jenis Keluhan | Deskripsi Cakupan Masalah | Usulan Target SLA | Satuan | Kalender Waktu | Prioritas Urgensi |
|:---:|:---|:---|:---:|:---:|:---:|:---:|
| **K-1** | **Keselamatan & Keamanan (Safety & Security)** | Barang tertinggal, pelecehan, gangguan keamanan di stasiun/rangkaian KA | **3 - 6** | Jam | Jam Kalender (24/7) | P0 (Kritis / Darurat) |
| **K-2** | **Fasilitas di Atas Kereta (On-Board Facility)** | AC mati/kurang dingin, toilet kotor/mampet, stopkontak rusak, kebersihan kursi | **6 - 12** | Jam | Jam Kalender (24/7) | P1 (Tinggi) |
| **K-3** | **Fasilitas Stasiun (Station Facility)** | Eskalator/lift mati, fasilitas difabel, kebersihan peron, ruang tunggu | **12 - 24** | Jam | Jam Kalender (24/7) | P2 (Sedang) |
| **K-4** | **Layanan Tiket & Sistem TI (Access by KAI)** | Gagal bayar, e-boarding pass tidak muncul, eror aplikasi tiket, transfer akun | **24** | Jam | Jam Kalender (24/7) | P2 (Sedang) |
| **K-5** | **Pelayanan Petugas (Service Attitude)** | Keramahan kondektur/prama-prami, ketidaksesuaian arahan petugas loket | **48** | Jam | Jam Kerja (Business Hours) | P3 (Standar) |
| **K-6** | **Refund & Finansial (Restitusi Tiket)** | Keterlambatan pengembalian dana tiket batal, selisih bea tarif | **3 - 7** | Hari Kerja | Jam Kerja (Business Hours) | P3 (Standar) |
| **K-7** | **Informasi Umum & Saran (General Inquiry)** | Pertanyaan jadwal perjalanan baru, saran penambahan gerbong | **72** | Jam | Jam Kerja (Business Hours) | P4 (Rendah) |

> *Catatan:* Nilai di atas merupakan rekomendasi best-practice operasional transportasi publik perkeretaapian. Penetapan angka final tunduk pada keputusan Pengguna.

---

## 4. Status Tampilan Indikator SLA pada Antarmuka

Berdasarkan sisa waktu dan target durasi, indikator SLA di antarmuka pengguna dibagi menjadi 4 zona visual:

1. **🟢 Terpenuhi (Met - Success):**
   * Diselesaikan dan disetujui dalam batas target SLA (`elapsedHours <= targetHours`).
   * Menampilkan durasi aktual penyelesaian (contoh: *"Terpenuhi dalam 8 Jam"*).
2. **🔵 Aktif Normal (Active - Neutral):**
   * Keluhan sedang berjalan dan sisa waktu masih di atas 25% dari total target SLA.
   * Menampilkan sisa waktu (contoh: *"Aktif (Sisa 16 Jam)"*).
3. **🟡 Mendekati Batas (Warning):**
   * Keluhan sedang berjalan dengan sisa waktu kurang dari 25% dari total target (atau sisa kurang dari 4 jam).
   * Memberikan sinyal visual kepada PIC dan Admin untuk akselerasi penanganan.
4. **🔴 Terlambat / Melewati Batas (Overdue - Danger):**
   * Waktu penyelesaian telah melampaui target durasi (`elapsedHours > targetHours`).
   * Menampilkan jumlah jam keterlambatan (contoh: *"Overdue (+14 Jam)"*).

---

## 5. Kebutuhan Perubahan Database untuk Mendukung SLA Berbasis Jenis Keluhan

Untuk mengimplementasikan spesifikasi SLA ini pada fase teknis berikutnya:
1. Penambahan kolom `category` (enum atau string kategori) pada tabel `Complaint`.
2. Penambahan kolom konfigurasi target SLA atau tabel referensi `SlaCategoryConfig` (menyimpan kategori, target waktu, satuan, tipe kalender).
3. Penambahan kolom timestamp `assignedAt` dan pemeliharaan timestamp `submittedAt` serta `verifiedAt` untuk memisahkan evaluasi KPI PIC vs KPI Sistem secara presisi.
