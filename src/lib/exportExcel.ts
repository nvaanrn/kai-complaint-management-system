import ExcelJS from "exceljs";
import { ComplaintData } from "@/components/DashboardClient";
import { KAI_LOGO_BASE64 } from "@/lib/kaiLogoBase64";

export interface ExcelExportOptions {
  documentNumber?: string;
  documentDate?: string;
  version?: string;
  creatorName?: string;
  managementRep?: string;
  pageInfo?: string;
  filenamePrefix?: string;
}

// Helper untuk menerapkan border ke cell
function applyCellBorder(
  cell: ExcelJS.Cell,
  borders: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  }
) {
  cell.border = {
    top: borders.top || { style: "thin", color: { argb: "FF000000" } },
    left: borders.left || { style: "thin", color: { argb: "FF000000" } },
    bottom: borders.bottom || { style: "thin", color: { argb: "FF000000" } },
    right: borders.right || { style: "thin", color: { argb: "FF000000" } },
  };
}

// Helper untuk menerapkan border pada seluruh area sel yang digabung (merged range)
function applyRangeBorders(
  ws: ExcelJS.Worksheet,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  borderStyle: ExcelJS.BorderStyle = "thin",
  colorArgb = "FF000000"
) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = ws.getCell(r, c);
      const currentBorder: Partial<ExcelJS.Borders> = cell.border || {};

      cell.border = {
        top: r === startRow ? { style: borderStyle, color: { argb: colorArgb } } : currentBorder.top,
        bottom: r === endRow ? { style: borderStyle, color: { argb: colorArgb } } : currentBorder.bottom,
        left: c === startCol ? { style: borderStyle, color: { argb: colorArgb } } : currentBorder.left,
        right: c === endCol ? { style: borderStyle, color: { argb: colorArgb } } : currentBorder.right,
      };
    }
  }
}

export async function exportComplaintsToExcel(
  complaints: ComplaintData[],
  options?: ExcelExportOptions | string
) {
  const opts: ExcelExportOptions =
    typeof options === "string"
      ? { filenamePrefix: options }
      : options || {};

  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const currentYear = new Date().getFullYear();

  const docNumber = opts.documentNumber || `DOC-${currentMonth}-${currentYear}`;
  const docDate =
    opts.documentDate ||
    new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const docVersion = opts.version || "002-2020";
  const creatorName = opts.creatorName || "Administrator SPKP";
  const managementRep = opts.managementRep || "Ir. Bambang Triyono (MR)";
  const pageInfo = opts.pageInfo || "1 dari 1";
  const filenamePrefix = opts.filenamePrefix || "FR_SM_TI_033_001_Keluhan_Pelanggan_KAI";

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PT Kereta Api Indonesia (Persero) - SPKP";
  workbook.lastModifiedBy = creatorName;
  workbook.created = new Date();
  workbook.modified = new Date();

  const ws = workbook.addWorksheet("FR.SM.TI.033.001", {
    views: [
      {
        state: "frozen",
        xSplit: 0,
        ySplit: 7, // Freeze tepat di bawah baris 7 (header tabel), data mulai baris 8
        activeCell: "A8",
        showGridLines: true,
      },
    ],
  });

  // 1. Definisikan lebar kolom tabel baku sesuai rasio dan proporsi PDF referensi KAI
  ws.columns = [
    { key: "no", width: 5 }, // A: No (3.5%)
    { key: "tanggal", width: 14 }, // B: Tanggal (8.5%)
    { key: "pelanggan", width: 22 }, // C: Pelanggan (12.0%)
    { key: "sumber", width: 16 }, // D: Sumber (9.0%)
    { key: "deskripsi", width: 34 }, // E: Deskripsi Keluhan (20.5%)
    { key: "tindakan", width: 34 }, // F: Tindakan perbaikan dan pencegahan yang diambil (19.5%)
    { key: "verifTgl", width: 13 }, // G: Verification -> Tgl (6.0%)
    { key: "verifPic", width: 14 }, // H: Verification -> PIC (6.0%)
    { key: "verifHasil", width: 13 }, // I: Verification -> Hasil (5.5%)
    { key: "keterangan", width: 18 }, // J: Keterangan (9.5%)
  ];

  // 2. KOP DOKUMEN RESMI PT KAI (PERSERO) — Baris 1 sampai 4
  ws.getRow(1).height = 18;
  ws.getRow(2).height = 18;
  ws.getRow(3).height = 18;
  ws.getRow(4).height = 18;

  // 2.1 Kotak Kiri: Logo KAI Resmi & Klasifikasi TERBATAS
  // A1:B2 -> Logo KAI Asli (gambar PNG dari public/kai-logo.png)
  ws.mergeCells("A1:B2");
  applyRangeBorders(ws, 1, 1, 2, 2, "thin");

  try {
    const logoId = workbook.addImage({
      base64: KAI_LOGO_BASE64,
      extension: "png",
    });

    ws.addImage(logoId, {
      tl: { col: 0, row: 0 },
      br: { col: 2, row: 2 },
    });
  } catch (err) {
    console.warn("Gagal menyematkan gambar logo KAI ke Excel, menggunakan teks cadangan:", err);
    const cellA1 = ws.getCell("A1");
    cellA1.value = "KAI";
    cellA1.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF1E3A8A" } };
    cellA1.alignment = { horizontal: "center", vertical: "middle" };
  }

  // A3:B4 -> Klasifikasi Dokumen TERBATAS (sesuai kotak kuning di PDF)
  ws.mergeCells("A3:B4");
  const cellA3 = ws.getCell("A3");
  cellA3.value = "TERBATAS";
  cellA3.font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FFCA8A04" } };
  cellA3.alignment = { horizontal: "center", vertical: "middle" };
  cellA3.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFBEB" },
  };
  applyRangeBorders(ws, 3, 1, 4, 2, "thin", "FFEAB308");

  // 2.2 Kotak Tengah: Identitas Organisasi & Judul Resmi Dokumen
  // C1:F2 -> PT KERETA API INDONESIA (PERSERO) & SISTEM INFORMASI
  ws.mergeCells("C1:F2");
  const cellC1 = ws.getCell("C1");
  cellC1.value = "PT KERETA API INDONESIA (PERSERO)\nSISTEM INFORMASI";
  cellC1.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF000000" } };
  cellC1.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  applyRangeBorders(ws, 1, 3, 2, 6, "thin");

  // C3:F4 -> DOKUMENTASI PENGELOLAAN DAN PENANGANAN KELUHAN PELANGGAN
  ws.mergeCells("C3:F4");
  const cellC3 = ws.getCell("C3");
  cellC3.value = "DOKUMENTASI PENGELOLAAN DAN PENANGANAN KELUHAN PELANGGAN";
  cellC3.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF000000" } };
  cellC3.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  applyRangeBorders(ws, 3, 3, 4, 6, "thin");

  // 2.3 Kotak Kanan: Metadata Dokumen (No. Dokumen, Tanggal, Versi, Halaman)
  // Baris 1: No. Dokumen
  const cellG1 = ws.getCell("G1");
  cellG1.value = "No. Dokumen";
  cellG1.font = { name: "Arial", size: 8, color: { argb: "FF000000" } };
  cellG1.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  applyCellBorder(cellG1);

  ws.mergeCells("H1:J1");
  const cellH1 = ws.getCell("H1");
  cellH1.value = `: ${docNumber}`;
  cellH1.font = { name: "Arial", size: 8, bold: true, color: { argb: "FF000000" } };
  cellH1.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  applyRangeBorders(ws, 1, 8, 1, 10, "thin");

  // Baris 2: Tanggal
  const cellG2 = ws.getCell("G2");
  cellG2.value = "Tanggal";
  cellG2.font = { name: "Arial", size: 8, color: { argb: "FF000000" } };
  cellG2.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  applyCellBorder(cellG2);

  ws.mergeCells("H2:J2");
  const cellH2 = ws.getCell("H2");
  cellH2.value = `: ${docDate}`;
  cellH2.font = { name: "Arial", size: 8, color: { argb: "FF000000" } };
  cellH2.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  applyRangeBorders(ws, 2, 8, 2, 10, "thin");

  // Baris 3: Versi
  const cellG3 = ws.getCell("G3");
  cellG3.value = "Versi";
  cellG3.font = { name: "Arial", size: 8, color: { argb: "FF000000" } };
  cellG3.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  applyCellBorder(cellG3);

  ws.mergeCells("H3:J3");
  const cellH3 = ws.getCell("H3");
  cellH3.value = `: ${docVersion}`;
  cellH3.font = { name: "Arial", size: 8, bold: true, color: { argb: "FF000000" } };
  cellH3.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  applyRangeBorders(ws, 3, 8, 3, 10, "thin");

  // Baris 4: Halaman
  const cellG4 = ws.getCell("G4");
  cellG4.value = "Halaman";
  cellG4.font = { name: "Arial", size: 8, color: { argb: "FF000000" } };
  cellG4.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  applyCellBorder(cellG4);

  ws.mergeCells("H4:J4");
  const cellH4 = ws.getCell("H4");
  cellH4.value = `: ${pageInfo}`;
  cellH4.font = { name: "Arial", size: 8, color: { argb: "FF000000" } };
  cellH4.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  applyRangeBorders(ws, 4, 8, 4, 10, "thin");

  // 3. Spacer Baris 5 (jarak pemisah sebelum tabel)
  ws.getRow(5).height = 8;

  // 4. HEADER TABEL UTAMA (Baris 6 & 7) — Latar putih bersih, font hitam bold, border tipis persis PDF
  ws.getRow(6).height = 22;
  ws.getRow(7).height = 18;

  // Merge kolom tabel yang tidak memiliki sub-kolom (A-F dan J)
  ws.mergeCells("A6:A7");
  ws.getCell("A6").value = "No";

  ws.mergeCells("B6:B7");
  ws.getCell("B6").value = "Tanggal";

  ws.mergeCells("C6:C7");
  ws.getCell("C6").value = "Pelanggan";

  ws.mergeCells("D6:D7");
  ws.getCell("D6").value = "Sumber";

  ws.mergeCells("E6:E7");
  ws.getCell("E6").value = "Deskripsi Keluhan";

  ws.mergeCells("F6:F7");
  ws.getCell("F6").value = "Tindakan perbaikan dan pencegahan yang diambil";

  // Header bertingkat Verification (G6:I6)
  ws.mergeCells("G6:I6");
  ws.getCell("G6").value = "Verification";

  ws.mergeCells("J6:J7");
  ws.getCell("J6").value = "Keterangan";

  // Sub-header tingkat 2 untuk Verification pada baris 7 (Tgl, PIC, Hasil persis PDF)
  ws.getCell("G7").value = "Tgl";
  ws.getCell("H7").value = "PIC";
  ws.getCell("I7").value = "Hasil";

  // Terapkan styling ke seluruh sel header (baris 6 dan 7)
  const headerColumns = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  [6, 7].forEach((rowNum) => {
    headerColumns.forEach((colLetter) => {
      const cell = ws.getCell(`${colLetter}${rowNum}`);
      cell.font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FF000000" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      applyCellBorder(cell);
    });
  });

  // Terapkan border menyeluruh untuk area merge header
  applyRangeBorders(ws, 6, 1, 7, 1, "thin");
  applyRangeBorders(ws, 6, 2, 7, 2, "thin");
  applyRangeBorders(ws, 6, 3, 7, 3, "thin");
  applyRangeBorders(ws, 6, 4, 7, 4, "thin");
  applyRangeBorders(ws, 6, 5, 7, 5, "thin");
  applyRangeBorders(ws, 6, 6, 7, 6, "thin");
  applyRangeBorders(ws, 6, 7, 6, 9, "thin");
  applyRangeBorders(ws, 6, 10, 7, 10, "thin");

  // CATATAN: Sesuai referensi PDF resmi KAI, teks panduan dalam tanda kurung dihilangkan total.
  // Data keluhan langsung dimulai pada baris ke-8.

  // 5. ISI DATA KELUHAN (Mulai Baris 8)
  let currentRow = 8;

  const dataToRender = [...complaints];
  // Menjaga format dokumen resmi: jika data kurang dari 4, buat baris kosong bergaris penyeimbang hingga 4 baris
  const minRows = complaints.length === 0 ? 4 : Math.max(complaints.length, 4);

  for (let idx = 0; idx < minRows; idx++) {
    const item = dataToRender[idx];
    const row = ws.getRow(currentRow);

    if (item) {
      // 5.1 Format Tanggal Pelaporan (e.g. 22 Sep 2026)
      const formattedDate = new Date(item.date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      // 5.2 Format Pelanggan (Nama tebal + Instansi/Daop/Unit dalam kurung)
      let customerText = item.customerName;
      if (item.daopOrStation) {
        customerText += `\n(${item.daopOrStation})`;
      }
      if (item.customerContact) {
        customerText += `\n${item.customerContact}`;
      }

      // 5.3 Format Tindakan Perbaikan & Pencegahan (PERBAIKAN: / PENCEGAHAN: huruf kapital tebal)
      let actionsText = "";
      if (item.correctiveAction) {
        actionsText += `PERBAIKAN:\n${item.correctiveAction}`;
      }
      if (item.preventiveAction) {
        if (actionsText) actionsText += "\n\nPENCEGAHAN:\n";
        else actionsText += "PENCEGAHAN:\n";
        actionsText += item.preventiveAction;
      }
      if (!actionsText) actionsText = "-";

      // 5.4 Format Tanggal Verifikasi
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

      // 5.5 Format PIC (Nama + Jabatan seperti Budi Santoso (PIC Operasional))
      let picText = item.pic?.name || (item.picId ? "Petugas Ditugaskan" : "-");
      if (item.pic && item.pic.role) {
        picText += `\n(${item.pic.role === "PIC" ? "PIC Operasional" : item.pic.role})`;
      }

      // 5.6 Format Hasil Verifikasi (DISETUJUI / DITOLAK / HASIL DITERIMA)
      let resultText =
        item.status === "TERVERIFIKASI"
          ? "DISETUJUI"
          : item.status || "-";
      let isApproved = item.status === "TERVERIFIKASI";

      if (item.verifications && item.verifications.length > 0) {
        const v = item.verifications[0];
        if (v.result === "APPROVED") {
          resultText = v.feedback ? v.feedback.toUpperCase() : "DISETUJUI";
          isApproved = true;
        } else {
          resultText = "DITOLAK";
          isApproved = false;
        }
      }

      // 5.7 Format Keterangan (Nomor Keluhan tebal + Catatan)
      let notesText = item.complaintNumber;
      if (item.notes) {
        notesText += `\n${item.notes}`;
      }

      // Col A: No
      const cA = ws.getCell(`A${currentRow}`);
      cA.value = idx + 1;
      cA.font = { name: "Arial", size: 8 };
      cA.alignment = { horizontal: "center", vertical: "top" };
      applyCellBorder(cA);

      // Col B: Tanggal
      const cB = ws.getCell(`B${currentRow}`);
      cB.value = formattedDate;
      cB.font = { name: "Arial", size: 8 };
      cB.alignment = { horizontal: "center", vertical: "top" };
      applyCellBorder(cB);

      // Col C: Pelanggan
      const cC = ws.getCell(`C${currentRow}`);
      cC.value = customerText;
      cC.font = { name: "Arial", size: 8 };
      cC.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      applyCellBorder(cC);

      // Col D: Sumber
      const cD = ws.getCell(`D${currentRow}`);
      cD.value = item.source;
      cD.font = { name: "Arial", size: 8 };
      cD.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      applyCellBorder(cD);

      // Col E: Deskripsi Keluhan
      const cE = ws.getCell(`E${currentRow}`);
      cE.value = item.description;
      cE.font = { name: "Arial", size: 8 };
      cE.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      applyCellBorder(cE);

      // Col F: Tindakan perbaikan dan pencegahan
      const cF = ws.getCell(`F${currentRow}`);
      cF.value = actionsText;
      cF.font = { name: "Arial", size: 8 };
      cF.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      applyCellBorder(cF);

      // Col G: Tgl Verifikasi
      const cG = ws.getCell(`G${currentRow}`);
      cG.value = verificationDate;
      cG.font = { name: "Arial", size: 8 };
      cG.alignment = { horizontal: "center", vertical: "top" };
      applyCellBorder(cG);

      // Col H: PIC
      const cH = ws.getCell(`H${currentRow}`);
      cH.value = picText;
      cH.font = { name: "Arial", size: 8 };
      cH.alignment = { horizontal: "center", vertical: "top", wrapText: true };
      applyCellBorder(cH);

      // Col I: Hasil Verifikasi (Lencana hasil verifikasi persis PDF)
      const cI = ws.getCell(`I${currentRow}`);
      cI.value = resultText;
      cI.font = {
        name: "Arial",
        size: 7.5,
        bold: true,
        color: { argb: isApproved ? "FF047857" : "FFB91C1C" },
      };
      cI.alignment = { horizontal: "center", vertical: "top", wrapText: true };
      cI.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isApproved ? "FFECFDF5" : "FFFEF2F2" },
      };
      applyCellBorder(cI);

      // Col J: Keterangan
      const cJ = ws.getCell(`J${currentRow}`);
      cJ.value = notesText;
      cJ.font = { name: "Arial", size: 8 };
      cJ.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      applyCellBorder(cJ);

      // Estimasi tinggi baris dinamis agar konten panjang tidak terpotong
      const lineCounts = [
        customerText.split("\n").length,
        Math.ceil(item.description.length / 32),
        actionsText.split("\n").length,
        picText.split("\n").length,
        notesText.split("\n").length,
      ];
      const maxLines = Math.max(1, ...lineCounts);
      row.height = Math.max(22, maxLines * 13.5);
    } else {
      // Baris kosong bergaris penyeimbang (persis baris 3 & 4 pada PDF)
      row.height = 20;
      headerColumns.forEach((colLetter) => {
        const cell = ws.getCell(`${colLetter}${currentRow}`);
        cell.value = colLetter === "A" ? idx + 1 : "";
        cell.font = { name: "Arial", size: 8, color: { argb: "FF94A3B8" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        applyCellBorder(cell);
      });
    }

    currentRow++;
  }

  // 6. BLOK TANDA TANGAN RESMI KAI (Signature Block) — Persis tata letak PDF
  currentRow += 1; // 1 baris spacer

  // Baris Judul Peran Tanda Tangan
  const sigRow1 = currentRow;
  ws.mergeCells(`B${sigRow1}:D${sigRow1}`);
  const cellSigL1 = ws.getCell(`B${sigRow1}`);
  cellSigL1.value = "Dibuat Oleh (Pelaksana SPKP):";
  cellSigL1.font = { name: "Arial", size: 8, color: { argb: "FF475569" } };
  cellSigL1.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(`G${sigRow1}:I${sigRow1}`);
  const cellSigR1 = ws.getCell(`G${sigRow1}`);
  cellSigR1.value = "Mengetahui:";
  cellSigR1.font = { name: "Arial", size: 8, color: { argb: "FF475569" } };
  cellSigR1.alignment = { horizontal: "center", vertical: "middle" };

  // Baris Jabatan Tanda Tangan
  const sigRow2 = sigRow1 + 1;
  ws.mergeCells(`B${sigRow2}:D${sigRow2}`);
  const cellSigL2 = ws.getCell(`B${sigRow2}`);
  cellSigL2.value = "Petugas Pengelola SPKP";
  cellSigL2.font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FF000000" } };
  cellSigL2.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(`G${sigRow2}:I${sigRow2}`);
  const cellSigR2 = ws.getCell(`G${sigRow2}`);
  cellSigR2.value = "Management Representative (MR)";
  cellSigR2.font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FF000000" } };
  cellSigR2.alignment = { horizontal: "center", vertical: "middle" };

  // Ruang fisik tanda tangan (2 baris setinggi 16pt)
  ws.getRow(sigRow2 + 1).height = 16;
  ws.getRow(sigRow2 + 2).height = 16;

  // Baris Nama Pejabat Penandatangan
  const sigRow3 = sigRow2 + 3;
  ws.mergeCells(`B${sigRow3}:D${sigRow3}`);
  const cellSigL3 = ws.getCell(`B${sigRow3}`);
  cellSigL3.value = creatorName;
  cellSigL3.font = { name: "Arial", size: 8.5, bold: true, underline: true, color: { argb: "FF000000" } };
  cellSigL3.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(`G${sigRow3}:I${sigRow3}`);
  const cellSigR3 = ws.getCell(`G${sigRow3}`);
  cellSigR3.value = managementRep;
  cellSigR3.font = { name: "Arial", size: 8.5, bold: true, underline: true, color: { argb: "FF000000" } };
  cellSigR3.alignment = { horizontal: "center", vertical: "middle" };

  // Baris Tanggal Pengesahan Tanda Tangan
  const sigRow4 = sigRow3 + 1;
  ws.mergeCells(`B${sigRow4}:D${sigRow4}`);
  const cellSigL4 = ws.getCell(`B${sigRow4}`);
  cellSigL4.value = `Tanggal: ${docDate}`;
  cellSigL4.font = { name: "Arial", size: 7.5, color: { argb: "FF475569" } };
  cellSigL4.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(`G${sigRow4}:I${sigRow4}`);
  const cellSigR4 = ws.getCell(`G${sigRow4}`);
  cellSigR4.value = `Tanggal: ${docDate}`;
  cellSigR4.font = { name: "Arial", size: 7.5, color: { argb: "FF475569" } };
  cellSigR4.alignment = { horizontal: "center", vertical: "middle" };

  // 7. FOOTER DOKUMEN RESMI KAI — Sejajar dan proporsional persis PDF
  const footerRow = sigRow4 + 2;

      // Row for Formulir Dokumentasi reference (appears before main footer)
      const docRefRow = footerRow;
      ws.mergeCells(`A${docRefRow}:J${docRefRow}`);
      const cellDocRef = ws.getCell(`A${docRefRow}`);
      cellDocRef.value = `Formulir Dokumentasi FR.SM/TI/033.001`;
      cellDocRef.font = { name: "Arial", size: 7.5, color: { argb: "FF64748B" } };
      cellDocRef.alignment = { horizontal: "center", vertical: "middle" };
      // Move main footer one row down
      const mainFooterRow = docRefRow + 1;
      ws.getRow(mainFooterRow).height = 16;
      ws.mergeCells(`A${mainFooterRow}:F${mainFooterRow}`);
      const cellFootL = ws.getCell(`A${mainFooterRow}`);
      cellFootL.value = "PT Kereta Api Indonesia (Persero)";
      cellFootL.font = { name: "Arial", size: 7.5, color: { argb: "FF64748B" } };
      cellFootL.alignment = { horizontal: "left", vertical: "middle" };
      ws.mergeCells(`G${mainFooterRow}:J${mainFooterRow}`);
      const cellFootR = ws.getCell(`G${mainFooterRow}`);
      cellFootR.value = `Edisi: ${docVersion}`;
      cellFootR.font = { name: "Arial", size: 7.5, color: { argb: "FF64748B" } };
      cellFootR.alignment = { horizontal: "right", vertical: "middle" };



  // 8. PENGATURAN CETAK (PRINT SETUP) PERSIS PDF
  ws.pageSetup = {
    orientation: "landscape",
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0, // Fleksibel ke bawah tanpa font dipaksa mengecil ekstrem
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.4,
      bottom: 0.4,
      header: 0.2,
      footer: 0.2,
    },
    printTitlesRow: "6:7", // Ulangi baris header tabel (Row 6 & 7) di setiap halaman cetak berikutnya
    printArea: `A1:J${footerRow}`,
  };

  // Header & Footer dinamis untuk pencetakan resmi
  ws.headerFooter = {
    oddFooter: '&L&"Arial"7.5PT Kereta Api Indonesia (Persero) - Formulir Dokumentasi FR.SM/TI/033.001&R&"Arial"7.5Halaman &P dari &N',
      '&L&"Arial"&7.5PT Kereta Api Indonesia (Persero)&R&"Arial"&7.5Halaman &P dari &N',
  };

  // Generate buffer untuk download atau ekspor
  const buffer = await workbook.xlsx.writeBuffer();
  const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const fullFileName = `${filenamePrefix}_${todayStr}.xlsx`;

  // Jika dipanggil di browser (Client-side), picu proses unduhan otomatis berkas .xlsx
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fullFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  return { workbook, buffer, fileName: fullFileName };
}
