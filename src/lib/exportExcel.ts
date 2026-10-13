import * as XLSX from "xlsx";
import { ComplaintData } from "@/components/DashboardClient";

export interface ExcelExportOptions {
  documentNumber?: string;
  documentDate?: string;
  version?: string;
  filenamePrefix?: string;
}

export function exportComplaintsToExcel(
  complaints: ComplaintData[],
  options?: ExcelExportOptions | string
) {
  const opts: ExcelExportOptions =
    typeof options === "string"
      ? { filenamePrefix: options }
      : options || {};

  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const currentYear = new Date().getFullYear();
  
  const docNumber = opts.documentNumber || `FR.SM/TI/033.001/${currentMonth}-${currentYear}`;
  const docDate =
    opts.documentDate ||
    new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const docVersion = opts.version || `002-${currentYear}`;
  const filenamePrefix = opts.filenamePrefix || "FR_SM_TI_033_001_Keluhan_Pelanggan_KAI";

  // Membangun baris matriks 2D sesuai template resmi baku KAI FR.SM/TI/033.001
  const sheetData: (string | number)[][] = [
    // Baris 1: Header PT KAI & No Dokumen
    [
      "PT KAI (PERSERO)",
      "",
      "PT KERETA API INDONESIA(PERSERO)",
      "",
      "",
      "",
      "No. Dokumen",
      `: ${docNumber}`,
      "",
      "",
    ],
    // Baris 2: Sub-header SISTEM INFORMASI & Tanggal Dokumen
    [
      "",
      "",
      "SISTEM INFORMASI",
      "",
      "",
      "",
      "Tanggal",
      `: ${docDate}`,
      "",
      "",
    ],
    // Baris 3: Label TERBATAS & Judul Dokumen & Versi
    [
      "TERBATAS",
      "",
      "DOKUMENTASI PENGELOLAAN DAN PENANGANAN KELUHAN PELANGGAN",
      "",
      "",
      "",
      "Versi",
      `: ${docVersion}`,
      "",
      "",
    ],
    // Baris 4: Halaman
    [
      "",
      "",
      "",
      "",
      "",
      "",
      "Halaman",
      ": 1 dari 1",
      "",
      "",
    ],
    // Baris 5: Spacer kosong
    ["", "", "", "", "", "", "", "", "", ""],
    // Baris 6: Header Kolom Tabel Tingkat 1
    [
      "No",
      "Tanggal",
      "Pelanggan",
      "Sumber",
      "Deskripsi Keluhan",
      "Tindakan perbaikan dan pencegahan yang diambil",
      "Verification",
      "",
      "",
      "Keterangan",
    ],
    // Baris 7: Header Kolom Tabel Tingkat 2 (Sub-kolom Verification)
    [
      "",
      "",
      "",
      "",
      "",
      "",
      "Tgl",
      "PIC",
      "Hasil",
      "",
    ],
    // Baris 8: Panduan Keterangan Merah Standar KAI
    [
      "",
      "(tanggal pelaporan keluhan)",
      "(nama personil / instansi yang merupakan pengguna layanan KAI)",
      "(sumber pelaporan keluhan, misal: via telepon, survey kepuasan pelanggan, laporan secara langsung, email, dll)",
      "(uraian terkait deskripsi dari keluhan yang dialami oleh pelanggan / pengguna layanan)",
      "(tindakan yang harus dilakukan untuk memperbaiki / mencegah keluhan)",
      "(tanggal verifikasi hasil tindakan perbaikan / pencegahan)",
      "(personil penanggung jawab pelaksanaan tindakan perbaikan / pencegahan)",
      "(hasil dari tindakan perbaikan / pencegahan)",
      "(keterangan lain terkait penanganan keluhan, jika ada)",
    ],
  ];

  // Baris 9+: Masukkan data keluhan
  if (complaints.length === 0) {
    // Berikan baris kosong bergaris jika belum ada data
    for (let i = 1; i <= 5; i++) {
      sheetData.push([i, "", "", "", "", "", "", "", "", ""]);
    }
  } else {
    complaints.forEach((item, idx) => {
      const formattedDate = new Date(item.date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      // Tindakan perbaikan & pencegahan
      let actions = "";
      if (item.correctiveAction) {
        actions += `Perbaikan: ${item.correctiveAction}`;
      }
      if (item.preventiveAction) {
        if (actions) actions += "\n";
        actions += `Pencegahan: ${item.preventiveAction}`;
      }
      if (!actions) {
        actions = "-";
      }

      // Tanggal verifikasi
      let verificationDate = "-";
      if (item.verifications && item.verifications.length > 0) {
        verificationDate = new Date(item.verifications[0].verifiedAt).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } else if (item.submittedAt) {
        verificationDate = new Date(item.submittedAt).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }

      // PIC
      const picName = item.pic?.name || (item.picId ? "Petugas Ditugaskan" : "-");

      // Hasil verifikasi
      let resultText = item.status === "TERVERIFIKASI" ? "Disetujui" : item.status;
      if (item.verifications && item.verifications.length > 0) {
        if (item.verifications[0].result === "APPROVED") {
          resultText = item.verifications[0].feedback ? item.verifications[0].feedback : "Disetujui";
        } else {
          resultText = "Ditolak / Perlu Revisi";
        }
      }

      // Keterangan
      const notes = item.notes
        ? `${item.complaintNumber} - ${item.notes}`
        : item.complaintNumber;

      sheetData.push([
        idx + 1,
        formattedDate,
        item.customerName + (item.daopOrStation ? ` (${item.daopOrStation})` : ""),
        item.source,
        item.description,
        actions,
        verificationDate,
        picName,
        resultText,
        notes,
      ]);
    });
  }

  // Buat worksheet dari array data
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Setup cell merges (penggabungan sel persis template baku)
  worksheet["!merges"] = [
    // Header Kiri Logo / Brand (A1:B2)
    { s: { r: 0, c: 0 }, e: { r: 1, c: 1 } },
    // Header Kiri TERBATAS (A3:B4)
    { s: { r: 2, c: 0 }, e: { r: 3, c: 1 } },
    // Header Tengah Baris 1: PT KERETA API INDONESIA (C1:F1)
    { s: { r: 0, c: 2 }, e: { r: 0, c: 5 } },
    // Header Tengah Baris 2: SISTEM INFORMASI (C2:F2)
    { s: { r: 1, c: 2 }, e: { r: 1, c: 5 } },
    // Header Tengah Baris 3 & 4: JUDUL BESAR DOKUMENTASI (C3:F4)
    { s: { r: 2, c: 2 }, e: { r: 3, c: 5 } },
    // Metadata Kanan Kolom Nilai (H1:J1, H2:J2, H3:J3, H4:J4)
    { s: { r: 0, c: 7 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 7 }, e: { r: 1, c: 9 } },
    { s: { r: 2, c: 7 }, e: { r: 2, c: 9 } },
    { s: { r: 3, c: 7 }, e: { r: 3, c: 9 } },

    // Merge Header Tabel: No (Row 5 to 6)
    { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } },
    // Merge Header Tabel: Tanggal (Row 5 to 6)
    { s: { r: 5, c: 1 }, e: { r: 6, c: 1 } },
    // Merge Header Tabel: Pelanggan (Row 5 to 6)
    { s: { r: 5, c: 2 }, e: { r: 6, c: 2 } },
    // Merge Header Tabel: Sumber (Row 5 to 6)
    { s: { r: 5, c: 3 }, e: { r: 6, c: 3 } },
    // Merge Header Tabel: Deskripsi Keluhan (Row 5 to 6)
    { s: { r: 5, c: 4 }, e: { r: 6, c: 4 } },
    // Merge Header Tabel: Tindakan perbaikan (Row 5 to 6)
    { s: { r: 5, c: 5 }, e: { r: 6, c: 5 } },
    // Merge Header Tabel: Verification (Row 5, Col 6 to 8)
    { s: { r: 5, c: 6 }, e: { r: 5, c: 8 } },
    // Merge Header Tabel: Keterangan (Row 5 to 6)
    { s: { r: 5, c: 9 }, e: { r: 6, c: 9 } },
  ];

  // Atur lebar kolom yang proporsional dan nyaman dibaca
  worksheet["!cols"] = [
    { wch: 6 },  // No
    { wch: 15 }, // Tanggal
    { wch: 25 }, // Pelanggan
    { wch: 22 }, // Sumber
    { wch: 45 }, // Deskripsi Keluhan
    { wch: 45 }, // Tindakan perbaikan dan pencegahan
    { wch: 15 }, // Verification: Tgl
    { wch: 22 }, // Verification: PIC
    { wch: 18 }, // Verification: Hasil
    { wch: 28 }, // Keterangan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "FR.SM.TI.033.001");

  const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
  XLSX.writeFile(workbook, `${filenamePrefix}_${todayStr}.xlsx`);
}
