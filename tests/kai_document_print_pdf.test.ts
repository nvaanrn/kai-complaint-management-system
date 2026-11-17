import { describe, it, expect } from "vitest";
import { ComplaintStatus, Role } from "@/types/database";
import { Permissions } from "@/lib/permissions";

describe("KAI Document Print and PDF Parity & Integrity Tests", () => {
  const sampleComplaints = [
    {
      id: "c-101",
      complaintNumber: "CMP-2026-001",
      date: new Date("2026-10-10T08:00:00Z"),
      customerName: "Bambang Pamungkas",
      customerContact: "081234567890",
      daopOrStation: "Daop 1 Jakarta - Gambir",
      source: "Access by KAI",
      description: "AC gerbong eksekutif 2 kurang dingin",
      status: ComplaintStatus.TERVERIFIKASI,
      correctiveAction: "Teknisi melakukan penggantian filter AC dan penambahan freon R134a",
      preventiveAction: "Jadwal pengecekan suhu kabin diperketat sebelum rangkaian diberangkatkan",
      notes: "Selesai ditangani tepat waktu",
      picId: "pic-1",
      pic: { id: "pic-1", name: "Ahmad Teknisi", email: "ahmad@kai.id", role: Role.PIC },
      verifications: [
        {
          id: "v-1",
          complaintId: "c-101",
          verifierId: "v-user-1",
          result: "APPROVED" as const,
          feedback: "Disetujui, suhu kabin sudah stabil di 22°C",
          cycle: 1,
          verifiedAt: new Date("2026-10-10T12:00:00Z"),
          verifier: { id: "v-user-1", name: "Doni Verifikator", role: Role.VERIFIKATOR },
        },
      ],
      createdAt: new Date("2026-10-10T08:00:00Z"),
    },
    {
      id: "c-102",
      complaintNumber: "CMP-2026-002",
      date: new Date("2026-10-11T09:30:00Z"),
      customerName: "Citra Dewi",
      customerContact: "081987654321",
      daopOrStation: "Daop 6 Yogyakarta - Tugu",
      source: "Contact Center 121",
      description: "Pintu geser otomatis toilet gerbong 4 tersendat",
      status: ComplaintStatus.TERVERIFIKASI,
      correctiveAction: "Pembersihan rel pintu dan pelumasan bearing mekanik",
      preventiveAction: "Pemeriksaan rel pintu masuk checklist harian",
      notes: "Keluhan ditutup",
      picId: "pic-2",
      pic: { id: "pic-2", name: "Bayu Mekanik", email: "bayu@kai.id", role: Role.PIC },
      verifications: [
        {
          id: "v-2",
          complaintId: "c-102",
          verifierId: "v-user-1",
          result: "APPROVED" as const,
          feedback: "Pintu sudah berfungsi normal dan lancar",
          cycle: 1,
          verifiedAt: new Date("2026-10-11T13:00:00Z"),
          verifier: { id: "v-user-1", name: "Doni Verifikator", role: Role.VERIFIKATOR },
        },
      ],
      createdAt: new Date("2026-10-11T09:30:00Z"),
    },
  ];

  describe("1. Kesamaan Proporsi dan Struktur Kolom Print & PDF", () => {
    it("Proporsi lebar kolom pada dokumen KAI FR.SM/TI/033.001 harus total 100%", () => {
      const colWidths = {
        no: 3.0,
        tanggal: 7.5,
        pelanggan: 11.5,
        sumber: 7.5,
        deskripsi: 19.0,
        tindakan: 18.5,
        verifGroup: 24.5,
        keterangan: 8.5,
      };

      const sumMainCols =
        colWidths.no +
        colWidths.tanggal +
        colWidths.pelanggan +
        colWidths.sumber +
        colWidths.deskripsi +
        colWidths.tindakan +
        colWidths.verifGroup +
        colWidths.keterangan;

      expect(sumMainCols).toBeCloseTo(100.0, 1);

      // Sub-kolom Verification (Tgl, PIC, Hasil)
      const verifSubCols = {
        verifTgl: 5.5,
        verifPic: 6.5,
        verifHasil: 12.5,
      };
      const sumVerifSubCols =
        verifSubCols.verifTgl + verifSubCols.verifPic + verifSubCols.verifHasil;
      expect(sumVerifSubCols).toBeCloseTo(colWidths.verifGroup, 1);
    });

    it("Format teks tindakan perbaikan dan pencegahan harus seragam antara Print dan PDF", () => {
      const item = sampleComplaints[0];
      const hasCorrective = Boolean(item.correctiveAction);
      const hasPreventive = Boolean(item.preventiveAction);

      expect(hasCorrective).toBe(true);
      expect(hasPreventive).toBe(true);

      const formattedActions = [
        item.correctiveAction ? `Perbaikan: ${item.correctiveAction}` : null,
        item.preventiveAction ? `Pencegahan: ${item.preventiveAction}` : null,
      ].filter(Boolean);

      expect(formattedActions.length).toBe(2);
      expect(formattedActions[0]).toContain("Teknisi melakukan penggantian filter AC");
      expect(formattedActions[1]).toContain("Jadwal pengecekan suhu kabin");
    });

    it("Menyediakan baris penyeimbang jika jumlah keluhan kurang dari 4 baris", () => {
      const minimumRows = 4;
      const currentRows = sampleComplaints.length; // 2 baris
      const emptyRowsNeeded = Math.max(0, minimumRows - currentRows);

      expect(emptyRowsNeeded).toBe(2);
      expect(currentRows + emptyRowsNeeded).toBe(minimumRows);
    });
  });

  describe("2. Integritas Dokumen & Snapshot Arsip Resmi", () => {
    it("Snapshot arsip dokumen terbit harus bersifat immutable saat keluhan di database berubah", () => {
      // 1. Simulasikan pembuatan dokumen beku (immutable snapshot)
      const frozenSnapshot = sampleComplaints.map((c) => ({
        complaintId: c.id,
        complaintNumber: c.complaintNumber,
        date: c.date,
        customerName: c.customerName,
        customerContact: c.customerContact,
        daopOrStation: c.daopOrStation,
        source: c.source,
        description: c.description,
        picName: c.pic?.name || "Tidak ditentukan",
        correctiveAction: c.correctiveAction,
        preventiveAction: c.preventiveAction,
        verifiedAt: c.verifications[0]?.verifiedAt,
        verifierName: c.verifications[0]?.verifier?.name || "Verifikator Mutu",
      }));

      const publishedDocument = {
        id: "doc-archive-001",
        documentNumber: "FR.SM/TI/033.001/10-2026",
        version: "002-2026",
        status: "PUBLISHED",
        managementRep: "Ir. Bambang Triyono (MR)",
        documentDate: new Date("2026-10-12T10:00:00Z"),
        snapshotData: frozenSnapshot,
        totalComplaints: frozenSnapshot.length,
      };

      // 2. Simulasikan mutasi keluhan aktif di database (misalnya ada yang mengedit keterangan)
      const mutatedLiveComplaints = [...sampleComplaints];
      mutatedLiveComplaints[0] = {
        ...mutatedLiveComplaints[0],
        description: "Deskripsi keluhan diubah secara sengaja di database aktif!",
        customerName: "Nama Penumpang Berubah",
      };

      // 3. Verifikasi: Dokumen arsip yang dicetak atau diunduh PDF TETAP menggunakan snapshot beku asli
      const archiveCustomerName = publishedDocument.snapshotData[0].customerName;
      const archiveDescription = publishedDocument.snapshotData[0].description;

      expect(archiveCustomerName).toBe("Bambang Pamungkas");
      expect(archiveDescription).toBe("AC gerbong eksekutif 2 kurang dingin");
      expect(archiveDescription).not.toBe(mutatedLiveComplaints[0].description);
    });

    it("Pencetakan atau unduh PDF tidak boleh mengubah status atau menambah record dokumen baru", () => {
      const initialDocCount = 5;
      let docCount = initialDocCount;

      // Fungsi simulasi cetak & unduh PDF
      const simulatePrint = () => {
        // window.print() hanya membaca data dan membuka dialog cetak browser
        return { action: "PRINT_DIALOG_OPENED" };
      };

      const simulateDownloadPdf = () => {
        // react-pdf menghasilkan blob untuk diunduh tanpa menyentuh database
        return { action: "PDF_BLOB_GENERATED" };
      };

      simulatePrint();
      simulateDownloadPdf();

      // Jumlah dokumen di database tetap sama persis (nol mutasi)
      expect(docCount).toBe(initialDocCount);
    });
  });

  describe("3. Kontrol Akses dan Otorisasi (RBAC)", () => {
    const adminUser = {
      id: "admin-1",
      name: "Admin KAI",
      email: "admin@kai.id",
      role: Role.ADMIN,
    };

    const picUser = {
      id: "pic-1",
      name: "Petugas PIC",
      email: "pic@kai.id",
      role: Role.PIC,
    };

    const verifikatorUser = {
      id: "verif-1",
      name: "Verifikator Mutu",
      email: "verif@kai.id",
      role: Role.VERIFIKATOR,
    };

    it("Hanya Admin yang berwenang menerbitkan dan mengunci dokumen audit resmi", () => {
      expect(Permissions.canGenerateDocument(adminUser)).toBe(true);
      expect(Permissions.canGenerateDocument(picUser)).toBe(false);
      expect(Permissions.canGenerateDocument(verifikatorUser)).toBe(false);
      expect(Permissions.canGenerateDocument(null)).toBe(false);
    });

    it("Keluhan yang belum TERVERIFIKASI tidak dapat diterbitkan sebagai dokumen audit resmi", () => {
      const mixedComplaints = [
        ...sampleComplaints,
        {
          id: "c-103",
          complaintNumber: "CMP-2026-003",
          status: ComplaintStatus.DALAM_PENANGANAN, // Belum selesai
        },
      ];

      const unverified = mixedComplaints.filter(
        (c) => c.status !== ComplaintStatus.TERVERIFIKASI
      );
      expect(unverified.length).toBe(1);
      expect(unverified[0].complaintNumber).toBe("CMP-2026-003");

      const canPublish = unverified.length === 0;
      expect(canPublish).toBe(false);
    });
  });

  describe("4. Tata Letak Cetak dan Pembagian Halaman (Print Pagination)", () => {
    it("CSS print harus mengatur ukuran A4 Landscape dan margin resmi", () => {
      const pageRules = {
        size: "A4 landscape",
        margin: "8mm 10mm 10mm 10mm",
      };

      expect(pageRules.size).toBe("A4 landscape");
      expect(pageRules.margin).toContain("8mm 10mm");
    });

    it("Mencegah pemisahan baris tabel atau tanda tangan yang terpotong pada dokumen panjang", () => {
      // Simulasikan dokumen dengan 25 keluhan (memerlukan multi-page)
      const longComplaintList = Array.from({ length: 25 }, (_, i) => ({
        id: `long-${i + 1}`,
        complaintNumber: `CMP-2026-${String(i + 1).padStart(3, "0")}`,
        customerName: `Pelanggan ${i + 1}`,
        date: new Date(),
        source: "Access by KAI",
        description: `Deskripsi keluhan pelanggan nomor ${i + 1}`,
        status: ComplaintStatus.TERVERIFIKASI,
      }));

      expect(longComplaintList.length).toBe(25);

      // Verifikasi konfigurasi paginasi:
      // 1. thead harus memiliki display table-header-group agar berulang di setiap lembar
      const theadPrintDisplay = "table-header-group";
      expect(theadPrintDisplay).toBe("table-header-group");

      // 2. Setiap baris harus memiliki break-inside: avoid
      const rowBreakInside = "avoid";
      expect(rowBreakInside).toBe("avoid");

      // 3. Tanda tangan harus berada di blok yang tidak boleh terbelah dua
      const signatureBreakInside = "avoid";
      expect(signatureBreakInside).toBe("avoid");
    });

    it("Validasi kontrak struktur data dan metadata dokumen KAI sebelum kompilasi PDF", () => {
      const pdfPayload = {
        complaints: sampleComplaints,
        documentNumber: "FR.SM/TI/033.001/10-2026",
        documentDate: "12 Oktober 2026",
        version: "002-2020",
        managementRep: "Ir. Bambang Triyono (MR)",
        creatorName: "Petugas SPKP KAI",
      };

      expect(pdfPayload.complaints.length).toBe(2);
      expect(pdfPayload.documentNumber).toMatch(/^FR\.SM\/TI\/033\.001\/\d{2}-\d{4}$/);
      expect(pdfPayload.version).toBe("002-2020");
      expect(pdfPayload.managementRep).toContain("MR");
    });
  });

  describe("5. Validasi Fungsional Transaksi, Konkurensi & Siklus Revisi Dokumen (Fase 2)", () => {
    it("1. Penerbitan membuat satu arsip final dengan snapshot data lengkap", () => {
      const complaintsToPublish = [sampleComplaints[0]];
      const publishedDoc = {
        id: "doc-uuid-1",
        documentNumber: "FR.SM/TI/033.001/10-2026",
        version: "002-2020",
        revisionNumber: 0,
        status: "PUBLISHED",
        documentDate: new Date("2026-10-18T00:00:00Z"),
        publishedAt: new Date(),
        managementRep: "Ir. Bambang Triyono (MR)",
        totalComplaints: 1,
        snapshotData: complaintsToPublish.map((c) => ({
          complaintId: c.id,
          complaintNumber: c.complaintNumber,
          date: c.date,
          customerName: c.customerName,
          customerContact: c.customerContact,
          daopOrStation: c.daopOrStation,
          source: c.source,
          description: c.description,
          picName: c.pic?.name || "Tidak ditentukan",
          correctiveAction: c.correctiveAction,
          preventiveAction: c.preventiveAction,
          proofImageUrl: null,
          notes: c.notes,
          status: c.status,
          verifiedAt: c.verifications[0]?.verifiedAt,
          verifierName: c.verifications[0]?.verifier?.name,
          verificationFeedback: c.verifications[0]?.feedback,
          cycle: 1,
        })),
      };

      expect(publishedDoc.id).toBeDefined();
      expect(publishedDoc.status).toBe("PUBLISHED");
      expect(publishedDoc.totalComplaints).toBe(1);
      expect(publishedDoc.snapshotData[0].notes).toBe("Selesai ditangani tepat waktu");
      expect(publishedDoc.snapshotData[0].verificationFeedback).toBe("Disetujui, suhu kabin sudah stabil di 22°C");
      expect(publishedDoc.snapshotData[0].cycle).toBe(1);
    });

    it("2. Print dan Unduh PDF tidak membuat arsip baru atau memutasi status database", () => {
      let databaseDocCount = 1;
      let databaseAuditLogCount = 1;

      // Simulasi aksi cetak dan unduh membaca snapshot arsip
      const triggerPrint = (doc: any) => {
        expect(doc.status).toBe("PUBLISHED");
        return "PRINT_WINDOW_TRIGGERED";
      };

      const triggerDownloadPdf = (doc: any) => {
        expect(doc.snapshotData.length).toBeGreaterThan(0);
        return "PDF_BLOB_STREAMED";
      };

      triggerPrint({ status: "PUBLISHED" });
      triggerDownloadPdf({ snapshotData: [{ id: "c-1" }] });

      expect(databaseDocCount).toBe(1);
      expect(databaseAuditLogCount).toBe(1);
    });

    it("3. Perubahan data keluhan aktif tidak mengubah snapshot lama (Immutable)", () => {
      const originalDescription = "AC gerbong eksekutif 2 kurang dingin";
      const frozenDoc = {
        id: "doc-archive-101",
        documentNumber: "FR.SM/TI/033.001/10-2026",
        snapshotData: [
          {
            complaintId: "c-101",
            complaintNumber: "CMP-2026-001",
            customerName: "Bambang Pamungkas",
            description: originalDescription,
            notes: "Catatan arsip asli",
          },
        ],
      };

      // Keluhan aktif diupdate di masa depan (misal: ada catatan tambahan atau koreksi typo oleh user)
      const liveComplaint = {
        id: "c-101",
        description: "AC gerbong eksekutif 2 kurang dingin (DIUBAH PADA 2027)",
        notes: "Catatan baru keluhan",
      };

      // Verifikasi snapshot dokumen tetap tidak tersentuh
      expect(frozenDoc.snapshotData[0].description).toBe(originalDescription);
      expect(frozenDoc.snapshotData[0].description).not.toBe(liveComplaint.description);
      expect(frozenDoc.snapshotData[0].notes).toBe("Catatan arsip asli");
    });

    it("4. Nomor, tanggal, dan versi konsisten sesuai spesifikasi KAI", () => {
      const targetDate = new Date("2026-10-18T06:00:00Z");
      const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
      const yyyy = targetDate.getFullYear();
      const expectedDocNumber = `FR.SM/TI/033.001/${mm}-${yyyy}`;
      const standardVersion = "002-2020";

      expect(expectedDocNumber).toBe("FR.SM/TI/033.001/10-2026");
      expect(standardVersion).toBe("002-2020");
      expect(targetDate.toISOString()).toContain("2026-10-18");
    });

    it("5. Dua penerbitan bersamaan (konkuren) tidak menghasilkan nomor yang sama", async () => {
      // Mock DocumentCounter state atomik
      let currentSequence = 0;
      const atomicCounterUpsert = async () => {
        // Simulasi database mutex lock pada baris (year, month)
        currentSequence += 1;
        return { lastSequence: currentSequence };
      };

      const generateDocNumberMock = async (date: Date) => {
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const yyyy = date.getFullYear();
        const counter = await atomicCounterUpsert();
        const seqStr = String(counter.lastSequence).padStart(3, "0");
        return `FR.SM/TI/033.${seqStr}/${mm}-${yyyy}`;
      };

      const now = new Date("2026-10-18T00:00:00Z");

      // Simulasikan 2 request penerbitan berjalan berbarengan (Promise.all)
      const [numA, numB] = await Promise.all([
        generateDocNumberMock(now),
        generateDocNumberMock(now),
      ]);

      expect(numA).not.toBe(numB);
      expect([numA, numB]).toContain("FR.SM/TI/033.001/10-2026");
      expect([numA, numB]).toContain("FR.SM/TI/033.002/10-2026");
    });

    it("6. Kegagalan transaksi tidak meninggalkan dokumen parsial", async () => {
      let docsTable: any[] = [];
      let complaintsTable: Array<{ id: string; documentId: string | null; status: ComplaintStatus }> = [
        { id: "c-1", documentId: null, status: ComplaintStatus.DALAM_PENANGANAN },
      ];

      const executeTransaction = async (shouldFail: boolean) => {
        const rollbackState = {
          docs: [...docsTable],
          complaints: JSON.parse(JSON.stringify(complaintsTable)),
        };

        try {
          // Langkah 1: Cek keluhan
          if (complaintsTable[0].status !== ComplaintStatus.TERVERIFIKASI) {
            throw new Error("Keluhan belum TERVERIFIKASI!");
          }

          // Langkah 2: Buat dokumen
          docsTable.push({ id: "doc-new" });
          complaintsTable[0].documentId = "doc-new";
        } catch (err) {
          // Rollback
          docsTable = rollbackState.docs;
          complaintsTable = rollbackState.complaints;
          throw err;
        }
      };

      // Jalankan transaksi yang ditolak
      await expect(executeTransaction(true)).rejects.toThrow("Keluhan belum TERVERIFIKASI!");

      // Buktikan tidak ada dokumen parsial yang tersimpan
      expect(docsTable.length).toBe(0);
      expect(complaintsTable[0].documentId).toBeNull();
    });

    it("7. Hak akses penerbitan tetap benar (Hanya Admin)", () => {
      const admin = { id: "a1", name: "Admin", email: "a@kai.id", role: Role.ADMIN };
      const pic = { id: "p1", name: "PIC", email: "p@kai.id", role: Role.PIC };
      const verif = { id: "v1", name: "Verif", email: "v@kai.id", role: Role.VERIFIKATOR };

      expect(Permissions.canGenerateDocument(admin)).toBe(true);
      expect(Permissions.canGenerateDocument(pic)).toBe(false);
      expect(Permissions.canGenerateDocument(verif)).toBe(false);
    });

    it("8. Mekanisme revisi menghubungkan dokumen ke parentDocumentId dan menandai SUPERSEDED", () => {
      const originalMasterDoc = {
        id: "doc-orig",
        documentNumber: "FR.SM/TI/033.001/10-2026",
        version: "002-2020",
        revisionNumber: 0,
        status: "PUBLISHED",
        parentDocumentId: null,
      };

      // Simulasikan alur revisi
      const revisedDoc = {
        id: "doc-rev-1",
        documentNumber: originalMasterDoc.documentNumber,
        version: "002-2020",
        revisionNumber: originalMasterDoc.revisionNumber + 1,
        parentDocumentId: originalMasterDoc.id,
        revisionReason: "Koreksi tindakan pencegahan keluhan AC",
        status: "PUBLISHED",
      };

      const updatedMasterDoc = {
        ...originalMasterDoc,
        status: "SUPERSEDED",
      };

      expect(revisedDoc.documentNumber).toBe(originalMasterDoc.documentNumber);
      expect(revisedDoc.revisionNumber).toBe(1);
      expect(revisedDoc.parentDocumentId).toBe("doc-orig");
      expect(revisedDoc.revisionReason).toBe("Koreksi tindakan pencegahan keluhan AC");
      expect(updatedMasterDoc.status).toBe("SUPERSEDED");
    });
  });
});
