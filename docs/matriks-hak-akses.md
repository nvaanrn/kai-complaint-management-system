# Matriks Hak Akses & Kewenangan (RBAC Matrix) — SPKP
**PT Kereta Api Indonesia (Persero)**

> **Versi Dokumen:** 1.0.0-Fase2  
> **Status:** Draft Arsitektur & Analisis Bisnis  
> **Tanggal:** 2026-10-10  
> **Prinsip Dasar:** Pemisahan Tugas (*Separation of Duties*), *Least Privilege*, dan *Four-Eyes Principle*.

---

## 1. Definisi Tiga Peran Utama (Three-Tier Roles)

1. **ADMIN (Customer Care Officer / Unit Pelayanan Pelanggan):**
   * Penanggung jawab registrasi data awal keluhan yang masuk dari seluruh saluran resmi KAI.
   * Pemegang wewenang tunggal untuk menugaskan dan mengganti PIC operasional.
   * Pemegang wewenang final untuk menyetujui atau menolak permohonan pembukaan kembali (*reopen*) keluhan.
   * Bertanggung jawab menyusun dan menerbitkan Berkas Rekapitulasi Resmi (`FR.SM/TI/033.001`).
   * **Batasan Kritis:** Dilarang melakukan verifikasi mutu penanganan keluhan.
2. **PIC (Petugas Pelaksana / Unit Kerja Terkait):**
   * Petugas unit operasional (misalnya: sarana, prasarana, pengamanan, layanan stasiun, TI) yang ditugaskan menyelesaikan permasalahan spesifik di lapangan.
   * Berwenang menginput tindakan perbaikan (*corrective*), tindakan pencegahan (*preventive*), catatan pelaksanaan, serta mengunggah foto bukti fisik ke Cloudinary.
   * Berwenang mengajukan hasil penanganannya kepada Verifikator jika seluruh bukti telah lengkap.
   * **Batasan Kritis:** Hanya berwenang mengeksekusi keluhan yang secara resmi ditugaskan kepada dirinya (`picId === user.id`). Tidak dapat memverifikasi pekerjaannya sendiri.
3. **VERIFIKATOR (Auditor Mutu Pelayanan / Supervisor Independen):**
   * Petugas pengawas mutu independen yang memastikan tindakan perbaikan dan pencegahan dari PIC telah memenuhi standar kualitas layanan KAI.
   * Pemegang wewenang eksklusif untuk menyetujui (*APPROVED*) atau menolak (*REJECTED*) hasil penanganan lapangan.
   * **Batasan Kritis:** Tidak menginput tindakan teknis lapangan dan tidak mengubah data registrasi keluhan.

---

## 2. Matriks Hak Akses & Operasi (CRUD + Business Actions)

Keterangan Simbol:
* **✅ Ya (Diizinkan):** Memiliki wewenang penuh pada aksi tersebut.
* **⚠️ Terbatas (Conditional):** Diizinkan hanya bila memenuhi prasyarat kepemilikan/status tertentu.
* **❌ Tidak (Dilarang):** Ditolak di layer UI maupun guard backend server.
* **❓ Perlu Konfirmasi:** Aturan bisnis yang masih membutuhkan penetapan keputusan pengguna.

| Fitur / Operasi Sistem | ADMIN | PIC (Petugas Lapangan) | VERIFIKATOR (Mutu) | Aturan Guard & Logika Validasi Backend |
|:---|:---:|:---:|:---:|:---|
| **1. Melihat Daftar Keluhan (List View)** | ✅ Ya | ✅ Ya *(Semua + Filter Tugas Saya)* | ✅ Ya *(Semua Keluhan)* | Semua role dapat melihat ringkasan untuk transparansi operasional. |
| **2. Melihat Detail Lengkap Keluhan** | ✅ Ya | ✅ Ya | ✅ Ya | Semua role dapat melihat detail lengkap dan histori. |
| **3. Membuat Keluhan Baru (Registrasi)** | ✅ Ya | ❌ Tidak | ❌ Tidak | `user.role === Role.ADMIN` |
| **4. Mengubah Data Pokok Registrasi** *(Nama Pelapor, Kontak, Daop, Uraian)* | ✅ Ya *(Status != TERVERIFIKASI)* | ❌ Tidak | ❌ Tidak | `user.role === Role.ADMIN`. Terkunci jika keluhan sudah `TERVERIFIKASI`. |
| **5. Menghapus Keluhan (Delete)** | ✅ Ya *(Soft-delete / Hard)* | ❌ Tidak | ❌ Tidak | `user.role === Role.ADMIN` |
| **6. Menugaskan PIC Awal** | ✅ Ya | ❌ Tidak | ❌ Tidak | `user.role === Role.ADMIN` |
| **7. Mengganti PIC yang Ditugaskan** | ✅ Ya *(Sebelum Verifikasi)* | ❌ Tidak | ❌ Tidak | `user.role === Role.ADMIN`. Dilarang saat status `MENUNGGU_VERIFIKASI`. |
| **8. Mengisi Draf Tindakan Penanganan** | ⚠️ Ya *(Superuser Override)* | ⚠️ Ya *(Hanya keluhan miliknya)* | ❌ Tidak | PIC: `complaint.picId === user.id` dan status `DALAM_PENANGANAN`. |
| **9. Mengunggah Foto Bukti (Cloudinary)** | ⚠️ Ya *(Superuser Override)* | ⚠️ Ya *(Hanya keluhan miliknya)* | ❌ Tidak | Khusus saat menangani keluhan. File diformat aman & divalidasi. |
| **10. Mengajukan Hasil ke Verifikator** *(Submit)* | ❌ Tidak | ⚠️ Ya *(Hanya keluhan miliknya)* | ❌ Tidak | PIC: `complaint.picId === user.id`. Wajib isi perbaikan, pencegahan, dan bukti foto. |
| **11. Menyetujui Hasil Penanganan (Approve)** | ❌ **DILARANG** *(SOP KAI)* | ❌ **DILARANG** | ✅ **EKSKLUSIF** | `user.role === Role.VERIFIKATOR`. Feedback wajib diisi. |
| **12. Menolak Hasil Penanganan (Reject)** | ❌ **DILARANG** *(SOP KAI)* | ❌ **DILARANG** | ✅ **EKSKLUSIF** | `user.role === Role.VERIFIKATOR`. Alasan penolakan wajib diisi. |
| **13. Mengajukan Permohonan Buka Kembali (Reopen)** | ❓ Perlu Konfirmasi | ❓ Perlu Konfirmasi | ❓ Perlu Konfirmasi | *Rekomendasi:* Diizinkan untuk Admin dan Verifikator (atau pelapor via CS). |
| **14. Menyetujui Pembukaan Kembali** | ✅ **EKSKLUSIF** | ❌ Dilarang | ❌ Dilarang | Mutlak `user.role === Role.ADMIN`. Mengembalikan ke `DALAM_PENANGANAN`. |
| **15. Menolak Pembukaan Kembali** | ✅ **EKSKLUSIF** | ❌ Dilarang | ❌ Dilarang | Mutlak `user.role === Role.ADMIN`. Keluhan tetap `TERVERIFIKASI`. |
| **16. Menerbitkan Dokumen FR.SM/TI/033.001** | ✅ Ya | ❌ Tidak | ❌ Tidak | `user.role === Role.ADMIN`. Hanya keluhan `TERVERIFIKASI`. |
| **17. Mengunduh Dokumen PDF Resmi** | ✅ Ya | ✅ Ya | ✅ Ya | Read-only dokumen audit bagi seluruh petugas berkepentingan. |
| **18. Melihat Histori & Audit Trail** | ✅ Ya | ✅ Ya | ✅ Ya | Seluruh role dapat membaca rekaman transparan verifikasi. |

---

## 3. Pembedaan Hak Baca (Read) vs Hak Ubah (Write / Mutate)

Penting untuk dicatat bahwa ketersediaan tampilan di layar antarmuka pengguna tidak otomatis memberikan izin modifikasi:

### Hak Baca (Read-Only):
* **Admin, PIC, dan Verifikator** sama-sama memiliki visibilitas baca terhadap seluruh daftar keluhan di sistem.
* PIC memiliki kenyamanan antarmuka berupa tab filter *"Tugas Saya"* untuk fokus pada beban kerjanya, namun tetap dapat melihat keluhan lain secara *read-only* agar memahami konteks operasional stasiun/daop.
* Verifikator dapat melihat keluhan dari semua daop untuk keperluan pengawasan mutu.

### Hak Ubah (Write / Mutate Guard):
* **Layer UI:** Tombol aksi hanya dirender jika role pengguna saat ini memenuhi kriteria otorisasi.
* **Layer Backend (Server Action):** Setiap mutasi wajib memvalidasi sesi server (`getCurrentUser()`) dan melakukan pemeriksaan hak akses secara mandiri. Kegagalan validasi menghasilkan respon `{ success: false, error: "Akses ditolak..." }` tanpa mengeksekusi operasi database.

---

## 4. Keputusan Izin yang Perlu Dikonfirmasi Pengguna

1. **Pemohon Reopen:** Apakah pengajuan buka kembali (*reopen request*) dapat diajukan oleh:
   * **Opsi 1:** Hanya Verifikator (sebagai pengawas mutu jika ditemukan ketidaksesuaian pasca-approval).
   * **Opsi 2:** Admin dan Verifikator.
   * **Opsi 3:** Semua pengguna termasuk PIC. *(Rekomendasi analis: Opsi 2 — Admin dan Verifikator).*
2. **Kewenangan Hapus Keluhan (Delete):** Saat ini Admin dapat menghapus keluhan secara permanen (*hard delete*). Apakah sebaiknya diubah menjadi *soft delete* (`isDeleted: true`) demi kepatuhan audit KAI?
3. **Penyuntingan Data Dasar saat Sedang Ditangani:** Apakah Admin masih boleh mengedit nama/kontak/uraian pelapor ketika PIC sedang aktif menangani keluhan (`DALAM_PENANGANAN`)? *(Rekomendasi: Boleh selama belum TERVERIFIKASI).*
