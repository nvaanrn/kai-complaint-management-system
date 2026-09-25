# Product Requirements Document (PRD)

## Sistem Penanganan Keluhan Pelanggan (SPKP)
**Dokumen Standar Pengendalian Mutu Layanan: `FR.SM/TI/033.001`**  
**Versi Dokumen:** 1.0.0 &bull; **Tanggal:** 25 September 2026 &bull; **Status:** Aktif

---

## 1. Pendahuluan & Latar Belakang

PT Kereta Api Indonesia (Persero) senantiasa berkomitmen menjaga mutu dan kepuasan pengguna jasa transportasi perkeretaapian. Selama operasional harian, keluhan pelanggan diterima dari beragam saluran (telepon layanan pelanggan, email resmi, survei kepuasan, hingga laporan tatap muka di stasiun).

Untuk menjamin setiap keluhan tercatat, ditindaklanjuti secara nyata di lapangan, serta diverifikasi mutunya sebelum dilaporkan kepada manajemen, diperlukan **Sistem Penanganan Keluhan Pelanggan (SPKP)** berbasis web yang terpusat dan akuntabel.

### 1.1 Tujuan Proyek (*Goals*)
1. **Dokumentasi Terstruktur:** Menyediakan satu portal tunggal terstandardisasi untuk mendokumentasikan keluhan pelanggan dari berbagai sumber.
2. **Pemisahan Peran yang Jelas (*Three-tier Role Governance*):**
   - **Admin (Customer Service):** Menginput keluhan dan mendistribusikan penugasan.
   - **PIC (Pelaksana Teknis):** Mengeksekusi tindakan perbaikan & pencegahan di lapangan lalu mengajukan verifikasi.
   - **Verifikator (Kendali Mutu):** Menguji dan memvalidasi mutu hasil eksekusi (Approve/Reject).
3. **Standarisasi Dokumen Output PDF:** Memungkinkan ekspor rekapitulasi penanganan keluhan ke format dokumen resmi **FR.SM/TI/033.001** lengkap dengan kolom tanda tangan pelaksana dan *Management Representative (MR)*.

### 1.2 Batasan Sistem (*Non-Goals / Scope Boundaries*)
- Sistem ini **hanya** untuk **dokumentasi dan alur verifikasi internal**.
- Sistem **bukan** portal publik (*customer-facing*) untuk tiket keluhan mandiri oleh penumpang.
- Sistem **bukan** aplikasi pesan instan/live chat dengan penumpang.

---

## 2. Aktor Sistem & User Persona

| Aktor / Role | Deskripsi Persona | Kebutuhan Utama |
| :--- | :--- | :--- |
| **Admin / Customer Service** | Staf CS atau Pengelola Layanan Pelanggan di kantor pusat/daop. | • Formulir input cepat untuk mencatat keluhan baru.<br>• Pemilihan sumber keluhan.<br>• Menu penugasan petugas PIC.<br>• Dashboard pemantauan keluhan aktif.<br>• Fitur seleksi dan ekspor laporan resmi PDF. |
| **PIC (Person in Charge)** | Petugas teknis operasional, sarana, prasarana, atau IT di lapangan. | • Melihat daftar keluhan yang menjadi tanggung jawabnya.<br>• Formulir input **Tindakan Perbaikan (*Corrective Action*)** dan **Tindakan Pencegahan (*Preventive Action*)**.<br>• Tombol ajukan verifikasi hasil. |
| **Verifikator** | Auditor mutu internal / *Quality Assurance* / Supervisor Layanan. | • Melihat daftar keluhan yang berstatus `MENUNGGU_VERIFIKASI`.<br>• Menelaah tindakan yang dilakukan PIC.<br>• Tombol **Setujui (Approve)** atau **Tolak (Reject)** dengan kewajiban input catatan evaluasi (*feedback*). |

---

## 3. Alur Kerja & Mesin Status (*State Machine*)

Setiap keluhan pelanggan memiliki siklus hidup status yang tegas:

```
[1. Input Keluhan Baru]
         │
         ▼
  BELUM_DITANGANI ──(Admin Menugaskan PIC)──► DALAM_PENANGANAN
                                                      ▲   │
                                     (Ditolak + Catatan)  │ (PIC Submit Tindakan)
                                                      │   ▼
                                              MENUNGGU_VERIFIKASI
                                                          │
                                                (Verifikator Menyetujui)
                                                          │
                                                          ▼
                                                    TERVERIFIKASI ──► [Siap Cetak / Ekspor PDF]
```

### Aturan Transisi Status & Kebijakan Bisnis (*Business Rules*):
1. **Penugasan Mutlak oleh Admin:** Penugasan petugas PIC hanya dan mutlak ditentukan oleh Admin berdasarkan jenis dan analisis keluhan. PIC tidak dapat menugaskan diri sendiri ataupun mengubah PIC keluhan lain.
2. **Visibilitas vs Hak Eksekusi PIC:** Petugas PIC memiliki izin untuk melihat dan memantau seluruh keluhan yang ada di dalam sistem (guna koordinasi operasional), namun **hanya dapat mengeksekusi** (mengisi tindakan, mengunggah bukti, dan mengajukan verifikasi) pada keluhan yang secara resmi ditugaskan kepada akun dirinya.
3. **Kewajiban Bukti Foto Hasil Perbaikan ke Supabase Storage:** Petugas PIC **wajib mengunggah foto bukti hasil perbaikan** ke Supabase Storage (bucket `complaint-proofs`) sebelum dapat mengajukan verifikasi.
4. Keluhan baru yang diinput tanpa PIC berstatus `BELUM_DITANGANI`. Jika Admin langsung menunjuk PIC, status otomatis menjadi `DALAM_PENANGANAN`.
5. Saat PIC mengajukan verifikasi (*Submit for Verification*), sistem memvalidasi kelengkapan: Tindakan Perbaikan, Tindakan Pencegahan, dan Foto Bukti Perbaikan. Jika lengkap, status beralih menjadi `MENUNGGU_VERIFIKASI`.
6. Jika Verifikator menyetujui (`APPROVED`), status menjadi `TERVERIFIKASI`. Jika menolak (`REJECTED`), Verifikator wajib menyertakan feedback tertulis, dan status kembali ke `DALAM_PENANGANAN` untuk direvisi oleh PIC bersangkutan.

---

## 4. Kebutuhan Fungsional (*Functional Requirements*)

### 4.1 Modul Autentikasi & Hak Akses (FR-AUTH)
- **FR-AUTH-01:** Sistem mendukung autentikasi kredensial (Email & Password) via Supabase Auth dengan sesi berbasis cookie HTTP aman (`@supabase/ssr`).
- **FR-AUTH-02:** Sistem menerapkan *Role-Based Access Control (RBAC)* di tingkat antarmuka, Server Actions, dan API middleware.
- **FR-AUTH-03:** Pengguna yang belum login otomatis dialihkan ke rute `/login`.

### 4.2 Modul Pencatatan & Penugasan Keluhan (FR-INPUT)
- **FR-INPUT-01:** Admin dapat mencatat keluhan dengan atribut:
  - Nomor Keluhan (otomatis terformat: `CMP-YYYY-XXX`)
  - Tanggal Kejadian / Laporan
  - Nama Pelanggan / Personel Pelapor
  - Kontak Pelapor / WhatsApp Pelapor (opsional)
  - Wilayah Operasional / Daop (Kantor Pusat, Daop 1 s.d. 9, Divre I s.d. IV)
  - Sumber Keluhan (`Telepon`, `Email`, `Survey`, `Laporan Langsung`, dll.)
  - Deskripsi Masalah
  - Penugasan PIC (ditentukan mutlak oleh Admin)
- **FR-INPUT-02:** Admin berwenang mengedit detail registrasi keluhan serta mengubah alokasi penugasan PIC sesuai kebutuhan penanganan.
- **FR-INPUT-03:** Admin berwenang menghapus data keluhan (dengan audit konfirmasi).

### 4.3 Modul Penanganan oleh PIC & SLA (FR-PIC)
- **FR-PIC-01:** PIC dapat melihat seluruh keluhan yang ada di dalam sistem untuk transparansi operasional, serta dapat memfilter secara khusus tab "Tugas Saya".
- **FR-PIC-02:** PIC hanya dapat mengeksekusi (mengedit tindakan & mengunggah bukti) pada keluhan yang `picId`-nya sesuai dengan ID pengguna PIC yang sedang login.
- **FR-PIC-03:** PIC dapat menyimpan draf tindakan perbaikan tanpa langsung mengajukan verifikasi (status tetap `DALAM_PENANGANAN`).
- **FR-PIC-04:** PIC wajib mengunggah foto bukti fisik/hasil perbaikan ke Supabase Storage (`complaint-proofs`).
- **FR-PIC-05:** PIC dapat mengajukan keluhan untuk verifikasi hanya apabila tindakan perbaikan, tindakan pencegahan, dan foto bukti telah lengkap. Saat diajukan, timestamp `submittedAt` tersimpan otomatis untuk audit SLA.
- **FR-PIC-06:** Sistem menyajikan badge audit SLA operasional otomatis berbasis target waktu penanganan 24 jam KAI (`SLA Terpenuhi`, `Mendekati Batas SLA`, atau `Overdue`).

### 4.4 Modul Verifikasi Mutu (FR-VERIFY)
- **FR-VERIFY-01:** Verifikator dapat memeriksa rincian tindakan perbaikan, tindakan pencegahan, dan meninjau langsung **foto bukti perbaikan** yang diunggah PIC.
- **FR-VERIFY-02:** Verifikator dapat menyetujui penanganan (`APPROVED`) sehingga status keluhan menjadi `TERVERIFIKASI`.
- **FR-VERIFY-03:** Verifikator dapat menolak penanganan (`REJECTED`) dengan kewajiban mengisi alasan/feedback perbaikan.
- **FR-VERIFY-04:** Setiap keputusan verifikasi dicatat secara historis ke tabel `Verification`.

### 4.5 Modul Ekspor Laporan Resmi PDF & Excel (FR-EXPORT)
- **FR-EXPORT-01:** Admin/Verifikator dapat memilih keluhan yang berstatus `TERVERIFIKASI` (atau keluhan lainnya) untuk dibundel ke dalam dokumen laporan mutu.
- **FR-EXPORT-02:** Sistem menggunakan library **`@react-pdf/renderer`** untuk meng-generate dokumen PDF berstandar formulir mutu **FR.SM/TI/033.001** (format A4 Landscape) secara presisi di sisi klien.
- **FR-EXPORT-03:** Pengguna dapat langsung mengunduh file PDF resmi (`.pdf`) hasil render komponen React-PDF yang mencantumkan kop KAI, tabel keluhan, dan kolom tanda tangan MR & Pelaksana.
- **FR-EXPORT-04:** Sistem menyediakan ekspor rekapitulasi ke format spreadsheet **Excel (`.xlsx`)** menggunakan SheetJS (`xlsx`) dengan audit SLA dan perapian lebar kolom otomatis untuk arsip administrasi.
- **FR-EXPORT-05:** Riwayat penerbitan dokumen tersimpan ke tabel `Document` bersama relasi nomor-nomor keluhan yang dibundel.

---

## 5. Spesifikasi Dokumen Output PDF (`FR.SM/TI/033.001`)

Dokumen rekapitulasi keluhan yang dihasilkan memuat komponen standar:
1. **Kop Surat Resmi:** Logo PT Kereta Api Indonesia (Persero) dan judul *"DAFTAR REKAPITULASI KELUHAN PELANGGAN"*.
2. **Metadata Kendali Mutu:**
   - Nomor Formulir Mutu: `FR.SM/TI/033.001`
   - Nomor Dokumen Batch: Format kustom atau otomatis `FR.SM/TI/033.001/MM-YYYY`
   - Versi: `002-2020`
   - Tanggal Dokumen
3. **Tabel Rincian Rekapitulasi:**
   - No. Urut & Nomor Keluhan (`CMP-YYYY-XXX`)
   - Tanggal Laporan
   - Nama Pelanggan
   - Sumber Laporan
   - Uraian Keluhan
   - Tindakan Penanganan (Perbaikan & Pencegahan)
   - Status Mutu (Disetujui / Terverifikasi)
   - Nama Petugas PIC
4. **Blok Otorisasi & Tanda Tangan:**
   - Kolom Pelaksana / Dibuat Oleh (Petugas SPKP)
   - Kolom Mengetahui (Management Representative - MR)

---

## 6. Kebutuhan Non-Fungsional (*Non-Functional Requirements*)

- **Keamanan (Security):** Seluruh query database dilindungi dengan Row Level Security (RLS) di Supabase. Autentikasi server divalidasi dengan `supabase.auth.getUser()`.
- **Performa:** Waktu render dashboard < 1 detik dengan pemanfaatan React Server Components dan indeks database pada kolom Foreign Key & Status.
- **Aksesibilitas & UI Responsif:** Antarmuka responsif ramah layar tablet dan desktop operasional stasiun/kantor.
- **Integritas Data:** Penghapusan keluhan menerapkan proteksi cascade dan pembatasan wewenang khusus Admin.
