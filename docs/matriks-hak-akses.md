# Matriks Hak Akses & Kewenangan (RBAC Matrix) — SPKP
**PT Kereta Api Indonesia (Persero)**

> **Versi Dokumen:** 3.0.0-Final  
> **Status:** Spesifikasi Hak Akses Resmi (Disinkronkan)  
> **Tanggal:** 2026-10-20  
> **Prinsip Dasar:** Pemisahan Tugas (*Separation of Duties*), *Least Privilege*, *Four-Eyes Principle*, dan Pencegahan *Self-Approval*.

---

## 1. Definisi Tiga Peran Utama (Three-Tier Roles)

1. **ADMIN (Customer Care Officer / Unit Pelayanan Pelanggan):**
   * Penanggung jawab registrasi data awal keluhan yang masuk dari seluruh saluran resmi KAI.
   * Pemegang wewenang tunggal untuk menugaskan dan mengganti PIC operasional.
   * Pemegang wewenang untuk menyetujui atau menolak permohonan pembukaan kembali (*reopen*) keluhan — **dengan catatan tidak dapat menyetujui permohonan yang diajukannya sendiri** (*Self-Approval Prevention*).
   * Bertanggung jawab menyusun dan menerbitkan Berkas Rekapitulasi Resmi (`FR.SM/TI/033.001`) dengan snapshot data beku.
   * **Batasan Kritis:** 
     - Dilarang keras melakukan verifikasi mutu penanganan keluhan (*Four-Eyes Principle*).
     - Dilarang keras menyimpan progres tindakan perbaikan atau mengajukan verifikasi atas nama PIC (*Separation of Duties*).
2. **PIC (Petugas Pelaksana / Unit Kerja Terkait):**
   * Petugas unit operasional (sarana, prasarana, pengamanan, layanan stasiun, TI) yang ditugaskan menyelesaikan permasalahan spesifik di lapangan.
   * Berwenang menginput tindakan perbaikan (*corrective*), tindakan pencegahan (*preventive*), catatan pelaksanaan, serta mengunggah foto bukti fisik ke Cloudinary.
   * Berwenang mengajukan hasil penanganannya kepada Verifikator jika seluruh bukti telah lengkap.
   * **Batasan Kritis:** Hanya berwenang mengeksekusi keluhan yang secara resmi ditugaskan kepada dirinya (`picId === user.id`). Tidak dapat memverifikasi pekerjaannya sendiri atau mengubah keluhan milik PIC lain.
3. **VERIFIKATOR (Auditor Mutu Pelayanan / Supervisor Independen):**
   * Petugas pengawas mutu independen yang memastikan tindakan perbaikan dan pencegahan dari PIC telah memenuhi standar kualitas layanan KAI.
   * Pemegang wewenang eksklusif untuk menyetujui (*APPROVED*) atau menolak (*REJECTED*) hasil penanganan lapangan.
   * Berwenang mengajukan permohonan pembukaan kembali (*reopen*) jika ditemukan ketidaksesuaian pasca-approval.
   * **Batasan Kritis:** Tidak menginput tindakan teknis lapangan dan tidak mengubah data registrasi keluhan.

---

## 2. Matriks Hak Akses & Operasi (CRUD + Business Actions)

Keterangan Simbol:
* **✅ Ya (Diizinkan):** Memiliki wewenang penuh pada aksi tersebut.
* **⚠️ Terbatas (Conditional):** Diizinkan hanya bila memenuhi prasyarat kepemilikan/status tertentu.
* **❌ Tidak (Dilarang):** Ditolak di layer UI maupun guard backend server (*403 Forbidden*).

| Fitur / Operasi Sistem | ADMIN | PIC (Petugas Lapangan) | VERIFIKATOR (Mutu) | Aturan Guard & Logika Validasi Backend |
|:---|:---:|:---:|:---:|:---|
| **1. Melihat Daftar Keluhan (List View)** | ✅ Ya | ✅ Ya *(Semua + Filter Tugas Saya)* | ✅ Ya *(Semua Keluhan)* | Semua role dapat melihat ringkasan untuk transparansi operasional. |
| **2. Melihat Detail Lengkap Keluhan** | ✅ Ya | ✅ Ya | ✅ Ya | Semua role dapat melihat detail lengkap dan kronologi. |
| **3. Membuat Keluhan Baru (Registrasi)** | ✅ Ya | ❌ Tidak | ❌ Tidak | `user.role === Role.ADMIN` |
| **4. Mengubah Data Pokok Registrasi** *(Nama Pelapor, Kontak, Daop, Uraian)* | ✅ Ya *(Status != TERVERIFIKASI)* | ❌ Tidak | ❌ Tidak | `user.role === Role.ADMIN`. Terkunci jika keluhan sudah `TERVERIFIKASI`. |
| **5. Menghapus Keluhan (Delete)** | ✅ Ya *(Belum masuk dokumen terbit)* | ❌ Tidak | ❌ Tidak | `user.role === Role.ADMIN`. Ditolak jika keluhan sudah memiliki `documentId`. |
| **6. Menugaskan PIC Awal** | ✅ Ya | ❌ Tidak | ❌ Tidak | `user.role === Role.ADMIN` |
| **7. Mengganti PIC yang Ditugaskan** | ✅ Ya *(Sebelum Verifikasi)* | ❌ Tidak | ❌ Tidak | `user.role === Role.ADMIN`. Dilarang saat status `MENUNGGU_VERIFIKASI`. |
| **8. Mengisi Draf Tindakan Penanganan** | ❌ **DILARANG** *(Separation of Duties)* | ⚠️ Ya *(Hanya keluhan miliknya)* | ❌ Tidak | PIC: `complaint.picId === user.id` dan status `DALAM_PENANGANAN`. Admin dilarang override. |
| **9. Mengunggah Foto Bukti (Cloudinary)** | ❌ **DILARANG** *(Separation of Duties)* | ⚠️ Ya *(Hanya keluhan miliknya)* | ❌ Tidak | Khusus saat PIC menangani keluhan miliknya. |
| **10. Mengajukan Hasil ke Verifikator** *(Submit)* | ❌ **DILARANG** | ⚠️ Ya *(Hanya keluhan miliknya)* | ❌ Tidak | PIC: `complaint.picId === user.id`. Wajib isi perbaikan, pencegahan, dan bukti foto. |
| **11. Menyetujui Hasil Penanganan (Approve)** | ❌ **DILARANG** *(Four-Eyes Principle)* | ❌ **DILARANG** | ✅ **EKSKLUSIF** | `user.role === Role.VERIFIKATOR`. Feedback wajib diisi. |
| **12. Menolak Hasil Penanganan (Reject)** | ❌ **DILARANG** *(Four-Eyes Principle)* | ❌ **DILARANG** | ✅ **EKSKLUSIF** | `user.role === Role.VERIFIKATOR`. Alasan penolakan wajib diisi. |
| **13. Mengajukan Permohonan Buka Kembali (Reopen)** | ✅ Ya | ❌ Tidak | ✅ Ya | Hanya untuk keluhan berstatus `TERVERIFIKASI`. Alasan wajib diisi. |
| **14. Menyetujui Pembukaan Kembali** | ⚠️ Ya *(Bukan pemohon sendiri)* | ❌ Dilarang | ❌ Dilarang | `user.role === Role.ADMIN` && `reopenReq.requestedById !== user.id`. |
| **15. Menolak Pembukaan Kembali** | ⚠️ Ya *(Bukan pemohon sendiri)* | ❌ Dilarang | ❌ Dilarang | `user.role === Role.ADMIN` && `reopenReq.requestedById !== user.id`. |
| **16. Menerbitkan Dokumen FR.SM/TI/033.001** | ✅ Ya | ❌ Tidak | ❌ Tidak | `user.role === Role.ADMIN`. Hanya keluhan `TERVERIFIKASI` (snapshot JSON dibekukan). |
| **17. Mencetak (Print) Dokumen Resmi** | ✅ Ya | ✅ Ya | ✅ Ya | Modal dokumen arsip dapat dicetak langsung tanpa menerbitkan ulang. |
| **18. Mengunduh Dokumen PDF Resmi** | ✅ Ya | ✅ Ya | ✅ Ya | Modal dokumen arsip dapat diunduh PDF langsung tanpa menerbitkan ulang. |
| **19. Ekspor Spreadsheet Excel (.xlsx)** | ✅ Ya *(Semua data)* | ✅ Ya *(Tugas miliknya)* | ✅ Ya *(Data terfilter)* | Format tabel resmi seragam KAI di semua role dengan cakupan data kontekstual. |
| **20. Melihat Histori & Audit Trail** | ✅ Ya | ✅ Ya | ✅ Ya | Seluruh role dapat membaca rekaman transparan verifikasi & aktivitas. |

---

## 3. Pembedaan Hak Baca (Read) vs Hak Ubah (Write / Mutate)

### Hak Baca (Read-Only):
* **Admin, PIC, dan Verifikator** memiliki transparansi operasional untuk melihat seluruh daftar keluhan di sistem.
* PIC memiliki kenyamanan antarmuka berupa tab filter *"Tugas Saya"* untuk memprioritaskan beban kerjanya, serta tetap dapat membaca keluhan lain untuk memahami konteks stasiun/daop.
* Verifikator dapat melihat keluhan dari seluruh wilayah kerja untuk pengawasan mutu independen.

### Hak Ubah (Write / Mutate Guard):
* **Layer UI:** Tombol dan formulir tindakan hanya dirender jika role pengguna dan kepemilikan tiket memenuhi syarat otorisasi.
* **Layer Backend (Server Action):** Setiap mutasi memvalidasi sesi server (`getCurrentUser()`) dan menerapkan pemeriksaan hak akses independen berlapis. Kegagalan validasi menghasilkan respon `{ success: false, error: "Akses ditolak..." }` tanpa mengeksekusi operasi database.
* **Proteksi Konkurensi:** Mutasi kritis (seperti peninjauan reopen) mengecek status `PENDING` di dalam transaksi database sebelum melakukan update (*atomic guard*).
