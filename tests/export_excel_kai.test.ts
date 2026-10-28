import { describe, it, expect } from "vitest";
import { exportComplaintsToExcel } from "@/lib/exportExcel";
import { ComplaintData } from "@/components/DashboardClient";
import { ComplaintStatus, Role, VerificationResult } from "@/types/database";

describe("Revisi Ekspor Excel SPKP Sesuai Referensi Visual PDF Dokumen Resmi KAI", () => {
  const dummyComplaints: ComplaintData[] = [
    {
      id: "c-001",
      complaintNumber: "CMP-2026-003",
      date: new Date("2026-09-22T10:00:00Z"),
      customerName: "Ibu Ratna",
      customerContact: null,
      daopOrStation: "Unit Layanan Terpadu",
      source: "Petugas Stasiun / Loket",
      description: "Permintaan rekapitulasi berkas tindak lanjut keluhan triwulan III",
      status: ComplaintStatus.TERVERIFIKASI,
      correctiveAction: "Penyusunan laporan rekapitulasi data triwulan III selesai dibuat.",
      preventiveAction: null,
      notes: "Sudah diajukan ke tim verifikator.",
      picId: "pic-1",
      pic: { id: "pic-1", name: "Budi Santoso", email: "budi@kai.id", role: Role.PIC },
      verifications: [
        {
          id: "v-001",
          complaintId: "c-001",
          verifierId: "v-01",
          result: VerificationResult.APPROVED,
          feedback: "Disetujui",
          cycle: 1,
          verifiedAt: new Date("2026-10-09T15:30:00Z"),
          verifier: { name: "Doni Verifikator", role: Role.VERIFIKATOR },
        },
      ],
      createdAt: new Date("2026-09-22T10:00:00Z"),
      updatedAt: new Date("2026-10-09T15:30:00Z"),
    },
    {
      id: "c-002",
      complaintNumber: "CMP-2026-001",
      date: new Date("2026-09-23T09:00:00Z"),
      customerName: "PT Surya Gemilang",
      customerContact: null,
      daopOrStation: null,
      source: "Contact Center 121",
      description: "Gangguan sinkronisasi data tagihan periode September 2026",
      status: ComplaintStatus.MENUNGGU_VERIFIKASI,
      correctiveAction: "Pengecekan log API dan sinkronisasi manual database transaksi.",
      preventiveAction: "ndfkjnkid",
      notes: null,
      picId: "pic-2",
      pic: { id: "pic-2", name: "Budi Santoso", email: "budi@kai.id", role: Role.PIC },
      verifications: [
        {
          id: "v-002",
          complaintId: "c-002",
          verifierId: "v-01",
          result: VerificationResult.APPROVED,
          feedback: "HASIL DITERIMA",
          cycle: 1,
          verifiedAt: new Date("2026-10-09T14:00:00Z"),
          verifier: { name: "Doni Verifikator", role: Role.VERIFIKATOR },
        },
      ],
      submittedAt: new Date("2026-10-09T14:00:00Z"),
      createdAt: new Date("2026-09-23T09:00:00Z"),
      updatedAt: new Date("2026-10-09T14:00:00Z"),
    },
  ];

  it("1. Harus menyematkan logo resmi KAI dan seluruh elemen identitas baku PDF", async () => {
    const result = await exportComplaintsToExcel(dummyComplaints, {
      documentNumber: "FR.SM/TI/033.001/10-2026",
      documentDate: "26 Oktober 2026",
      version: "002-2020",
      creatorName: "Administrator SPKP",
      managementRep: "Ir. Bambang Triyono (MR)",
      pageInfo: "1 dari 1",
    });

    const ws = result.workbook.getWorksheet("FR.SM.TI.033.001");
    expect(ws).toBeDefined();
    if (!ws) return;

    // Logo resmi KAI disematkan sebagai gambar (bukan teks biasa)
    const images = ws.getImages();
    expect(images.length).toBeGreaterThan(0);

    // Identitas TERBATAS dalam badge kotak kuning
    const cellA3 = ws.getCell("A3");
    expect(cellA3.value?.toString()).toBe("TERBATAS");

    // Identitas Sistem Informasi & Perusahaan
    const cellC1 = ws.getCell("C1");
    expect(cellC1.value?.toString()).toContain("PT KERETA API INDONESIA (PERSERO)");
    expect(cellC1.value?.toString()).toContain("SISTEM INFORMASI");

    // Judul Dokumen Resmi
    const cellC3 = ws.getCell("C3");
    expect(cellC3.value?.toString()).toBe("DOKUMENTASI PENGELOLAAN DAN PENANGANAN KELUHAN PELANGGAN");

    // Metadata Dokumen di Sisi Kanan (No. Dokumen, Tanggal, Versi, Halaman)
    expect(ws.getCell("G1").value?.toString()).toBe("No. Dokumen");
    expect(ws.getCell("H1").value?.toString()).toContain("FR.SM/TI/033.001/10-2026");

    expect(ws.getCell("G2").value?.toString()).toBe("Tanggal");
    expect(ws.getCell("H2").value?.toString()).toContain("26 Oktober 2026");

    expect(ws.getCell("G3").value?.toString()).toBe("Versi");
    expect(ws.getCell("H3").value?.toString()).toContain("002-2020");

    expect(ws.getCell("G4").value?.toString()).toBe("Halaman");
    expect(ws.getCell("H4").value?.toString()).toContain("1 dari 1");
  });

  it("2. Menghilangkan teks petunjuk merah dalam tanda kurung; data dimulai tepat pada baris 8", async () => {
    const result = await exportComplaintsToExcel(dummyComplaints);
    const ws = result.workbook.getWorksheet("FR.SM.TI.033.001")!;

    // Nomor dokumen default harus menggunakan format resmi FR.SM/TI/033.001/MM-YYYY
    expect(ws.getCell("H1").value?.toString()).toMatch(/FR\.SM\/TI\/033\.001\/\d{2}-\d{4}/);

    // Baris 6 & 7: Header kolom tabel
    expect(ws.getCell("A6").value).toBe("No");
    expect(ws.getCell("G6").value).toBe("Verification");
    expect(ws.getCell("G7").value).toBe("Tgl");
    expect(ws.getCell("H7").value).toBe("PIC");
    expect(ws.getCell("I7").value).toBe("Hasil");
    expect(ws.getCell("J6").value).toBe("Keterangan");

    // Baris 8 adalah baris data pertama (bukan baris petunjuk contoh)
    expect(ws.getCell("A8").value).toBe(1);
    expect(ws.getCell("C8").value?.toString()).toContain("Ibu Ratna");
    expect(ws.getCell("B8").value?.toString()).not.toContain("(tanggal pelaporan keluhan)");

    // Pastikan tidak ada sel yang mengandung teks petunjuk merah dalam kurung
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        const val = cell.value ? cell.value.toString() : "";
        expect(val).not.toContain("(tanggal pelaporan keluhan)");
        expect(val).not.toContain("(nama personil / instansi");
        expect(val).not.toContain("(uraian terkait deskripsi");
      });
    });
  });

  it("3. Struktur tabel dan format data keluhan sesuai persis referensi PDF", async () => {
    const result = await exportComplaintsToExcel(dummyComplaints);
    const ws = result.workbook.getWorksheet("FR.SM.TI.033.001")!;

    // Baris 8: Keluhan 1
    expect(ws.getCell("A8").value).toBe(1);
    expect(ws.getCell("B8").value?.toString()).toContain("22 Sep 2026");
    expect(ws.getCell("C8").value?.toString()).toContain("Ibu Ratna");
    expect(ws.getCell("C8").value?.toString()).toContain("(Unit Layanan Terpadu)");
    expect(ws.getCell("D8").value).toBe("Petugas Stasiun / Loket");
    expect(ws.getCell("E8").value).toBe("Permintaan rekapitulasi berkas tindak lanjut keluhan triwulan III");
    expect(ws.getCell("F8").value?.toString()).toContain("PERBAIKAN:\nPenyusunan laporan rekapitulasi data triwulan III selesai dibuat.");
    expect(ws.getCell("G8").value?.toString()).toContain("09 Okt 2026");
    expect(ws.getCell("H8").value?.toString()).toContain("Budi Santoso");
    expect(ws.getCell("H8").value?.toString()).toContain("(PIC Operasional)");
    expect(ws.getCell("I8").value).toBe("DISETUJUI");
    expect(ws.getCell("J8").value?.toString()).toContain("CMP-2026-003");
    expect(ws.getCell("J8").value?.toString()).toContain("Sudah diajukan ke tim verifikator.");

    // Baris 9: Keluhan 2
    expect(ws.getCell("A9").value).toBe(2);
    expect(ws.getCell("B9").value?.toString()).toContain("23 Sep 2026");
    expect(ws.getCell("C9").value?.toString()).toContain("PT Surya Gemilang");
    expect(ws.getCell("D9").value).toBe("Contact Center 121");
    expect(ws.getCell("F9").value?.toString()).toContain("PERBAIKAN:");
    expect(ws.getCell("F9").value?.toString()).toContain("PENCEGAHAN:\nndfkjnkid");
    expect(ws.getCell("I9").value).toBe("HASIL DITERIMA");

    // Baris 10 dan 11: Baris penyeimbang kosong (No 3 & 4 seperti di PDF)
    expect(ws.getCell("A10").value).toBe(3);
    expect(ws.getCell("A11").value).toBe(4);
    expect(ws.getCell("C10").value).toBe("");
    expect(ws.getCell("C11").value).toBe("");
  });

  it("4. Bagian tanda tangan dan footer sejajar proporsional persis PDF", async () => {
    const result = await exportComplaintsToExcel(dummyComplaints, {
      creatorName: "Administrator SPKP",
      managementRep: "Ir. Bambang Triyono (MR)",
      documentDate: "26 Oktober 2026",
      version: "002-2020",
    });
    const ws = result.workbook.getWorksheet("FR.SM.TI.033.001")!;

    let foundCreatorRole = false;
    let foundCreatorName = false;
    let foundMRRole = false;
    let foundMRName = false;
    let foundFooterForm = false;
    let foundFooterEdisi = false;

    ws.eachRow((row) => {
      const textRow = row.values ? JSON.stringify(row.values) : "";
      if (textRow.includes("Dibuat Oleh (Pelaksana SPKP):")) foundCreatorRole = true;
      if (textRow.includes("Administrator SPKP")) foundCreatorName = true;
      if (textRow.includes("Management Representative (MR)")) foundMRRole = true;
      if (textRow.includes("Ir. Bambang Triyono (MR)")) foundMRName = true;
      if (textRow.includes("Formulir Dokumentasi FR.SM/TI/033.001")) foundFooterForm = true;
      if (textRow.includes("Edisi: 002-2020")) foundFooterEdisi = true;
    });

    expect(foundCreatorRole).toBe(true);
    expect(foundCreatorName).toBe(true);
    expect(foundMRRole).toBe(true);
    expect(foundMRName).toBe(true);
    expect(foundFooterForm).toBe(true);
    expect(foundFooterEdisi).toBe(true);
  });

  it("5. Pengaturan Cetak (Print Setup): Landscape, A4, Repeat Header Row 6:7", async () => {
    const result = await exportComplaintsToExcel(dummyComplaints);
    const ws = result.workbook.getWorksheet("FR.SM.TI.033.001")!;

    expect(ws.pageSetup.orientation).toBe("landscape");
    expect(ws.pageSetup.paperSize).toBe(9); // A4
    expect(ws.pageSetup.fitToPage).toBe(true);
    expect(ws.pageSetup.fitToWidth).toBe(1);
    expect(ws.pageSetup.fitToHeight).toBe(0);
    expect(ws.pageSetup.printTitlesRow).toBe("6:7");

    // Dynamic page numbers dan header/footer cetak
    expect(ws.headerFooter.oddFooter).toContain("&P");
    expect(ws.headerFooter.oddFooter).toContain("&N");
    expect(ws.headerFooter.oddFooter).toContain("FR.SM/TI/033.001");
  });

  it("6. Mampu menghasilkan file Excel biner (.xlsx) utuh yang dapat disimpan", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const result = await exportComplaintsToExcel(dummyComplaints, {
      documentNumber: "FR.SM/TI/033.001/10-2026",
      documentDate: "26 Oktober 2026",
      version: "002-2020",
      creatorName: "Administrator SPKP",
      managementRep: "Ir. Bambang Triyono (MR)",
      pageInfo: "1 dari 1",
    });

    expect(result.buffer.byteLength).toBeGreaterThan(10000); // Harus berisi data + logo PNG
    expect(result.fileName).toBe("FR_SM_TI_033_001_Keluhan_Pelanggan_KAI_" + new Date().toISOString().split("T")[0].replace(/-/g, "") + ".xlsx");

    const scratchDir = path.join(process.cwd(), "scratch");
    if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
    const targetFile = path.join(scratchDir, "sample_FR_SM_TI_033_001.xlsx");
    fs.writeFileSync(targetFile, Buffer.from(result.buffer));
    expect(fs.existsSync(targetFile)).toBe(true);
  });
});
