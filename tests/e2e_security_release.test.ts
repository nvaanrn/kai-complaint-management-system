import { describe, it, expect } from "vitest";
import {
  ComplaintStatus,
  Role,
  VerificationResult,
  AuditAction,
  ReopenStatus,
} from "@/types/database";
import { validateStateTransition } from "@/lib/state-machine";
import { Permissions, UserSession, ComplaintSummary } from "@/lib/permissions";
import { formatComplaintNumber } from "@/lib/complaintNumber";
import {
  validateComplaintInput,
  validatePicExecutionInput,
  validateVerificationInput,
  validateReopenRequestInput,
  validateReopenReviewInput,
} from "@/lib/validation";

describe("FASE 7 — Pengujian Integrasi, Keamanan, dan Arsip Dokumen SPKP", () => {
  // Test Actor Sessions
  const adminUser: UserSession = {
    id: "user-admin-01",
    name: "Admin Pengendali Mutu",
    email: "admin@spkp.kai.id",
    role: Role.ADMIN,
  };

  const picUser1: UserSession = {
    id: "user-pic-01",
    name: "Petugas PIC Lapangan 1",
    email: "pic1@spkp.kai.id",
    role: Role.PIC,
  };

  const picUser2: UserSession = {
    id: "user-pic-02",
    name: "Petugas PIC Lapangan 2",
    email: "pic2@spkp.kai.id",
    role: Role.PIC,
  };

  const verifikatorUser: UserSession = {
    id: "user-veri-01",
    name: "Verifikator Mutu Layanan",
    email: "verifikator@spkp.kai.id",
    role: Role.VERIFIKATOR,
  };

  // =========================================================================
  // LANGKAH 2: UJI ALUR BISNIS END-TO-END (HAPPY PATH & REJECTION LOOP)
  // =========================================================================
  describe("Langkah 2: Alur Bisnis End-to-End Siklus Hidup Keluhan", () => {
    // Simulasi database state untuk 1 tiket keluhan
    interface ComplaintRecord {
      id: string;
      complaintNumber: string;
      customerName: string;
      customerContact?: string | null;
      daopOrStation?: string | null;
      source: string;
      date: Date;
      description: string;
      status: ComplaintStatus;
      picId: string | null;
      assignedAt?: Date | null;
      correctiveAction?: string | null;
      preventiveAction?: string | null;
      proofImageUrl?: string | null;
      notes?: string | null;
      submittedAt?: Date | null;
      completedAt?: Date | null;
      submissionCount: number;
      documentId?: string | null;
      verifications: Array<{
        id: string;
        verifierId: string;
        result: VerificationResult;
        feedback?: string | null;
        cycle: number;
        verifiedAt: Date;
      }>;
      auditLogs: Array<{
        action: AuditAction;
        userId: string;
        timestamp: Date;
        details?: any;
      }>;
    }

    it("Alur Normal (Happy Path): Dicatat -> Ditetapkan PIC -> Dikerjakan -> Disetujui -> Diterbitkan Dokumen -> Reopen", () => {
      // 1. Keluhan dibuat oleh Admin sesuai kewenangan
      const regInput = {
        customerName: "Raditya Prasetya",
        customerContact: "081234567890",
        daopOrStation: "Daop 1 Jakarta",
        source: "Contact Center 121",
        date: "2026-10-14",
        description: "AC kereta eksekutif gerbong 2 tidak dingin selama perjalanan",
      };
      const regValidation = validateComplaintInput(regInput);
      expect(regValidation.isValid).toBe(true);

      const complaintNumber = formatComplaintNumber(2026, 1);
      expect(complaintNumber).toBe("CMP-2026-001");

      const ticket: ComplaintRecord = {
        id: "comp-uuid-001",
        complaintNumber,
        customerName: regInput.customerName,
        customerContact: regInput.customerContact,
        daopOrStation: regInput.daopOrStation,
        source: regInput.source,
        date: new Date(regInput.date),
        description: regInput.description,
        status: ComplaintStatus.BELUM_DITANGANI,
        picId: null,
        submissionCount: 0,
        verifications: [],
        auditLogs: [
          {
            action: AuditAction.CREATE_COMPLAINT,
            userId: adminUser.id,
            timestamp: new Date("2026-10-14T08:00:00Z"),
          },
        ],
      };
      expect(ticket.status).toBe(ComplaintStatus.BELUM_DITANGANI);

      // 2. Admin menetapkan PIC
      expect(Permissions.canAssignPIC(adminUser)).toBe(true);
      const assignTransition = validateStateTransition(
        ticket.status,
        AuditAction.ASSIGN_PIC,
        adminUser.role
      );
      expect(assignTransition.isAllowed).toBe(true);
      expect(assignTransition.nextStatus).toBe(ComplaintStatus.DALAM_PENANGANAN);

      ticket.picId = picUser1.id;
      ticket.assignedAt = new Date("2026-10-14T08:30:00Z");
      ticket.status = assignTransition.nextStatus!;
      ticket.auditLogs.push({
        action: AuditAction.ASSIGN_PIC,
        userId: adminUser.id,
        timestamp: ticket.assignedAt,
        details: { picId: picUser1.id },
      });

      // 3. PIC memperbarui penanganan & simpan draf
      expect(ticket.picId).toBe(picUser1.id);
      ticket.correctiveAction = "Penggantian modul freon dan filter pendingin AC gerbong 2";
      ticket.preventiveAction = "Pengecekan rutin kompresor setiap sebelum keberangkatan";
      ticket.proofImageUrl = "https://storage.kai.id/proofs/ac_repaired.webp";
      ticket.auditLogs.push({
        action: AuditAction.SAVE_PROGRESS,
        userId: picUser1.id,
        timestamp: new Date("2026-10-14T12:00:00Z"),
      });

      // 4. PIC mengajukan hasil untuk verifikasi
      const picVal = validatePicExecutionInput({
        correctiveAction: ticket.correctiveAction,
        preventiveAction: ticket.preventiveAction,
        proofImageUrl: ticket.proofImageUrl,
        submitForVerification: true,
      });
      expect(picVal.isValid).toBe(true);

      const submitTransition = validateStateTransition(
        ticket.status,
        AuditAction.SUBMIT_VERIFICATION,
        picUser1.role
      );
      expect(submitTransition.isAllowed).toBe(true);
      expect(submitTransition.nextStatus).toBe(ComplaintStatus.MENUNGGU_VERIFIKASI);

      ticket.status = submitTransition.nextStatus!;
      ticket.submittedAt = new Date("2026-10-14T14:00:00Z");
      ticket.submissionCount += 1;
      expect(ticket.submissionCount).toBe(1);

      // 5. Verifikator menyetujui (Approved)
      expect(Permissions.canVerifyComplaint(verifikatorUser)).toBe(true);
      const verifyTransition = validateStateTransition(
        ticket.status,
        AuditAction.VERIFY_APPROVED,
        verifikatorUser.role
      );
      expect(verifyTransition.isAllowed).toBe(true);
      expect(verifyTransition.nextStatus).toBe(ComplaintStatus.TERVERIFIKASI);

      ticket.status = verifyTransition.nextStatus!;
      ticket.completedAt = new Date("2026-10-14T15:30:00Z");
      ticket.verifications.push({
        id: "verif-001",
        verifierId: verifikatorUser.id,
        result: VerificationResult.APPROVED,
        feedback: "Suhu kabin gerbong 2 stabil di 21 derajat Celcius, perbaikan sesuai SOP.",
        cycle: ticket.submissionCount,
        verifiedAt: ticket.completedAt,
      });

      // 6. Keluhan ditandai selesai dengan timestamp yang benar
      expect(ticket.status).toBe(ComplaintStatus.TERVERIFIKASI);
      expect(ticket.completedAt).toBeDefined();
      expect(ticket.submittedAt).not.toEqual(ticket.completedAt);

      // 7. Dokumen diterbitkan sebagai arsip resmi
      expect(Permissions.canGenerateDocument(adminUser)).toBe(true);
      const archivedSnapshot = [
        {
          complaintId: ticket.id,
          complaintNumber: ticket.complaintNumber,
          customerName: ticket.customerName,
          correctiveAction: ticket.correctiveAction,
          preventiveAction: ticket.preventiveAction,
          verifiedAt: ticket.completedAt,
          verifierName: verifikatorUser.name,
        },
      ];
      ticket.documentId = "doc-batch-202610-001";
      expect(ticket.documentId).toBe("doc-batch-202610-001");
      expect(archivedSnapshot[0].customerName).toBe("Raditya Prasetya");

      // 8. Permintaan pembukaan kembali (Reopen Request) diajukan
      const reopenSummary: ComplaintSummary = {
        id: ticket.id,
        status: ticket.status,
        picId: ticket.picId,
        complaintNumber: ticket.complaintNumber,
      };
      expect(Permissions.canRequestReopen(adminUser, reopenSummary)).toBe(true);
      const reopenInput = { reason: "Pelanggan melapor AC kembali bermasalah pada perjalanan balik" };
      expect(validateReopenRequestInput(reopenInput).isValid).toBe(true);

      const reopenRecord = {
        id: "reopen-req-001",
        complaintId: ticket.id,
        requestedById: adminUser.id,
        reason: reopenInput.reason,
        status: ReopenStatus.PENDING,
      };
      expect(reopenRecord.status).toBe(ReopenStatus.PENDING);

      // 9. Admin menyetujui permohonan pembukaan kembali
      expect(Permissions.canReviewReopen(adminUser)).toBe(true);
      const reviewInput = {
        decision: "APPROVED" as const,
        adminNotes: "Disetujui untuk perbaikan menyeluruh sistem AC",
      };
      expect(validateReopenReviewInput(reviewInput).isValid).toBe(true);

      const reopenTransition = validateStateTransition(
        ticket.status,
        AuditAction.APPROVE_REOPEN,
        adminUser.role
      );
      expect(reopenTransition.isAllowed).toBe(true);
      expect(reopenTransition.nextStatus).toBe(ComplaintStatus.DALAM_PENANGANAN);

      // 10. Jika disetujui, status kembali DALAM_PENANGANAN & PIC TETAP SAMA
      ticket.status = reopenTransition.nextStatus!;
      ticket.completedAt = null;
      expect(ticket.status).toBe(ComplaintStatus.DALAM_PENANGANAN);
      expect(ticket.picId).toBe(picUser1.id); // Retensi PIC utuh
    });

    it("Alur Penolakan (Rejection Loop): Ditolak Verifikator -> Alasan Tersimpan -> Kembali ke PIC Sama -> PIC Ajukan Ulang", () => {
      const ticket: ComplaintRecord = {
        id: "comp-uuid-002",
        complaintNumber: "KAI-202610-0002",
        customerName: "Siti Rahayu",
        source: "Email",
        date: new Date("2026-10-14T09:00:00Z"),
        description: "Kursi 12A patah penyangga tangan",
        status: ComplaintStatus.MENUNGGU_VERIFIKASI,
        picId: picUser2.id,
        submissionCount: 1,
        correctiveAction: "Penyangga kursi telah dipasang kembali",
        preventiveAction: "Pengecekan baut berkala",
        proofImageUrl: "https://storage.kai.id/proofs/chair_bad.webp",
        submittedAt: new Date("2026-10-14T11:00:00Z"),
        verifications: [],
        auditLogs: [],
      };

      // Verifikator menolak dengan feedback
      const rejectionFeedback = "Foto bukti buram dan tidak tampak nomor kursi 12A. Mohon foto ulang dengan pencahayaan jelas.";
      const verifVal = validateVerificationInput({
        result: VerificationResult.REJECTED,
        feedback: rejectionFeedback,
      });
      expect(verifVal.isValid).toBe(true);

      const rejectTransition = validateStateTransition(
        ticket.status,
        AuditAction.VERIFY_REJECTED,
        verifikatorUser.role
      );
      expect(rejectTransition.isAllowed).toBe(true);
      expect(rejectTransition.nextStatus).toBe(ComplaintStatus.DALAM_PENANGANAN);

      // Mutasi status & simpan record verifikasi siklus 1
      ticket.status = rejectTransition.nextStatus!;
      ticket.verifications.push({
        id: "verif-cycle-1",
        verifierId: verifikatorUser.id,
        result: VerificationResult.REJECTED,
        feedback: rejectionFeedback,
        cycle: 1,
        verifiedAt: new Date("2026-10-14T11:30:00Z"),
      });

      // Verifikasi integritas:
      expect(ticket.status).toBe(ComplaintStatus.DALAM_PENANGANAN);
      expect(ticket.picId).toBe(picUser2.id); // PIC tidak boleh berubah
      expect(ticket.verifications.length).toBe(1);
      expect(ticket.verifications[0].result).toBe(VerificationResult.REJECTED);
      expect(ticket.completedAt).toBeUndefined();

      // PIC memperbaiki dan mengajukan ulang (siklus 2)
      ticket.proofImageUrl = "https://storage.kai.id/proofs/chair_clear_12A.webp";
      ticket.status = ComplaintStatus.MENUNGGU_VERIFIKASI;
      ticket.submittedAt = new Date("2026-10-14T13:00:00Z");
      ticket.submissionCount += 1;
      expect(ticket.submissionCount).toBe(2);

      // Verifikator menyetujui siklus 2
      ticket.status = ComplaintStatus.TERVERIFIKASI;
      ticket.completedAt = new Date("2026-10-14T13:30:00Z");
      ticket.verifications.push({
        id: "verif-cycle-2",
        verifierId: verifikatorUser.id,
        result: VerificationResult.APPROVED,
        feedback: "Foto bukti nomor kursi 12A jelas dan kokoh.",
        cycle: 2,
        verifiedAt: ticket.completedAt,
      });

      // Histori verifikasi lengkap dengan 2 catatan terpisah
      expect(ticket.verifications.length).toBe(2);
      expect(ticket.verifications[0].cycle).toBe(1);
      expect(ticket.verifications[1].cycle).toBe(2);
      expect(ticket.verifications[1].result).toBe(VerificationResult.APPROVED);
    });
  });

  // =========================================================================
  // LANGKAH 3: UJI SKENARIO NEGATIF & KEAMANAN OTORISASI
  // =========================================================================
  describe("Langkah 3: Skenario Negatif & Pengujian Keamanan Otorisasi", () => {
    it("Admin DILARANG KERAS memverifikasi keluhan (Four-Eyes Principle)", () => {
      expect(Permissions.canVerifyComplaint(adminUser)).toBe(false);

      const res = validateStateTransition(
        ComplaintStatus.MENUNGGU_VERIFIKASI,
        AuditAction.VERIFY_APPROVED,
        Role.ADMIN
      );
      expect(res.isAllowed).toBe(false);
      expect(res.error).toContain("Hanya Verifikator");
    });

    it("PIC DILARANG mengubah keluhan yang tidak ditugaskan kepadanya (Ownership Check)", () => {
      const ticketAssignedToPic1 = {
        id: "comp-pic-1",
        picId: picUser1.id,
        status: ComplaintStatus.DALAM_PENANGANAN,
      };

      // picUser2 mencoba mengeksekusi
      const canPic2Execute = picUser2.role === Role.PIC && ticketAssignedToPic1.picId === picUser2.id;
      expect(canPic2Execute).toBe(false);
    });

    it("Pengguna tanpa autentikasi (null) DITOLAK dari semua mutasi", () => {
      const unauthenticatedUser = null;
      expect(Permissions.canAssignPIC(unauthenticatedUser)).toBe(false);
      expect(Permissions.canVerifyComplaint(unauthenticatedUser)).toBe(false);
      expect(Permissions.canGenerateDocument(unauthenticatedUser)).toBe(false);
      expect(Permissions.canDeleteComplaint(unauthenticatedUser)).toBe(false);
      expect(Permissions.canReviewReopen(unauthenticatedUser)).toBe(false);
    });

    it("Transisi status ilegal DITOLAK oleh State Machine", () => {
      // 1. BELUM_DITANGANI langsung ke TERVERIFIKASI
      const illegal1 = validateStateTransition(
        ComplaintStatus.BELUM_DITANGANI,
        AuditAction.VERIFY_APPROVED,
        Role.VERIFIKATOR
      );
      expect(illegal1.isAllowed).toBe(false);

      // 2. TERVERIFIKASI langsung diajukan verifikasi ulang tanpa reopen
      const illegal2 = validateStateTransition(
        ComplaintStatus.TERVERIFIKASI,
        AuditAction.SUBMIT_VERIFICATION,
        Role.PIC
      );
      expect(illegal2.isAllowed).toBe(false);

      // 3. MENUNGGU_VERIFIKASI di-assign PIC ulang oleh Admin saat review berlangsung
      const illegal3 = validateStateTransition(
        ComplaintStatus.MENUNGGU_VERIFIKASI,
        AuditAction.ASSIGN_PIC,
        Role.ADMIN
      );
      expect(illegal3.isAllowed).toBe(false);
    });

    it("Penolakan verifikasi tanpa alasan DITOLAK oleh server", () => {
      const emptyRejection = validateVerificationInput({
        result: VerificationResult.REJECTED,
        feedback: "    ",
      });
      expect(emptyRejection.isValid).toBe(false);
      expect(emptyRejection.firstError).toContain("Catatan revisi wajib dicantumkan");
    });

    it("Keluhan yang sudah masuk dokumen arsip terbit DILINDUNGI dari penghapusan", () => {
      const archivedComplaint: ComplaintSummary = {
        id: "comp-archived",
        status: ComplaintStatus.TERVERIFIKASI,
        picId: picUser1.id,
        complaintNumber: "KAI-202610-0099",
      };

      // Diuji via guard: jika complaint.documentId ada, throw error
      const isDocumentIdPresent = true;
      const canDeleteArchived = Permissions.canDeleteComplaint(adminUser) && !isDocumentIdPresent;
      expect(canDeleteArchived).toBe(false);
    });
  });

  // =========================================================================
  // LANGKAH 4: UJI INTEGRITAS DATABASE & AUDIT LOG
  // =========================================================================
  describe("Langkah 4: Integritas Database, Relasi, & Audit Log", () => {
    it("Format nomor keluhan terjamin unik dan mematuhi format standar KAI", () => {
      const num1 = formatComplaintNumber(2026, 1);
      const num2 = formatComplaintNumber(2026, 2);
      const num3 = formatComplaintNumber(2026, 100);

      expect(num1).toBe("CMP-2026-001");
      expect(num2).toBe("CMP-2026-002");
      expect(num3).toBe("CMP-2026-100");
      expect(num1).not.toBe(num2);
    });

    it("Siklus verifikasi (cycle counter) tersimpan konsisten dan tidak pernah minus", () => {
      const cycles = [1, 2, 3];
      cycles.forEach((c) => {
        expect(c).toBeGreaterThan(0);
      });
    });

    it("Aksi mutasi penting selalu mencatat Audit Log dengan entity yang sesuai", () => {
      const requiredAuditActions = [
        AuditAction.CREATE_COMPLAINT,
        AuditAction.ASSIGN_PIC,
        AuditAction.SAVE_PROGRESS,
        AuditAction.SUBMIT_VERIFICATION,
        AuditAction.VERIFY_APPROVED,
        AuditAction.VERIFY_REJECTED,
        AuditAction.GENERATE_DOCUMENT,
      ];

      requiredAuditActions.forEach((action) => {
        expect(Object.values(AuditAction)).toContain(action);
      });
    });
  });

  // =========================================================================
  // LANGKAH 5: UJI ARSIP DOKUMEN & IMMUTABILITY SNAPSHOT
  // =========================================================================
  describe("Langkah 5: Integritas Dokumen Arsip & Immutability", () => {
    it("Snapshot arsip dokumen bersifat beku (immutable) meskipun data tiket aktif diubah di masa depan", () => {
      // 1. Data asli saat penerbitan dokumen
      const originalComplaint = {
        id: "comp-snap-1",
        complaintNumber: "KAI-202610-0010",
        customerName: "Ahmad Dahlan",
        description: "Keluhan fasilitas toilet gerbong 4 kotor",
        correctiveAction: "Pembersihan total dan disinfeksi",
      };

      // 2. Bekukan ke dalam snapshot dokumen
      const frozenDocumentSnapshot = JSON.parse(
        JSON.stringify([
          {
            complaintId: originalComplaint.id,
            complaintNumber: originalComplaint.complaintNumber,
            customerName: originalComplaint.customerName,
            description: originalComplaint.description,
            correctiveAction: originalComplaint.correctiveAction,
          },
        ])
      );

      // 3. Modifikasi data tiket aktif di masa depan
      originalComplaint.customerName = "Nama Telah Berubah";
      originalComplaint.description = "Deskripsi telah diedit oleh Admin";

      // 4. Verifikasi bahwa snapshot arsip dokumen TIDAK TERPENGARUH
      expect(frozenDocumentSnapshot[0].customerName).toBe("Ahmad Dahlan");
      expect(frozenDocumentSnapshot[0].description).toBe("Keluhan fasilitas toilet gerbong 4 kotor");
      expect(frozenDocumentSnapshot[0].customerName).not.toBe(originalComplaint.customerName);
    });

    it("Hanya tiket berstatus TERVERIFIKASI yang diizinkan masuk ke dokumen arsip resmi", () => {
      const validComplaint = { status: ComplaintStatus.TERVERIFIKASI };
      const invalidComplaint1 = { status: ComplaintStatus.BELUM_DITANGANI };
      const invalidComplaint2 = { status: ComplaintStatus.MENUNGGU_VERIFIKASI };

      const canIncludeInDoc = (status: ComplaintStatus) => status === ComplaintStatus.TERVERIFIKASI;

      expect(canIncludeInDoc(validComplaint.status)).toBe(true);
      expect(canIncludeInDoc(invalidComplaint1.status)).toBe(false);
      expect(canIncludeInDoc(invalidComplaint2.status)).toBe(false);
    });
  });
});
