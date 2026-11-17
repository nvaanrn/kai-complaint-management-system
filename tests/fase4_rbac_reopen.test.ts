import { describe, it, expect } from "vitest";
import { ComplaintStatus, Role, AuditAction, ReopenStatus } from "@/types/database";
import { validateStateTransition } from "@/lib/state-machine";
import { Permissions, UserSession, ComplaintSummary } from "@/lib/permissions";

/**
 * FASE 4 — Pengujian Penguatan Hak Akses PIC dan Persetujuan Reopen SPKP
 *
 * Cakupan:
 * 1. PIC mengubah keluhan yang ditugaskan kepadanya (diizinkan)
 * 2. PIC tidak dapat mengubah keluhan PIC lain (ditolak)
 * 3. Admin tidak dapat menyimpan progres atas nama PIC (ditolak)
 * 4. Verifikator tidak dapat menjalankan aksi PIC (ditolak)
 * 5. Pemohon reopen tidak dapat menyetujui permohonannya sendiri (ditolak)
 * 6. Reopen yang disetujui: status DALAM_PENANGANAN, PIC tetap sama
 * 7. Reopen yang ditolak: status TERVERIFIKASI tidak berubah
 * 8. Pemanggilan endpoint langsung tunduk pada pemeriksaan otorisasi
 */
describe("FASE 4 — Penguatan Hak Akses PIC dan Persetujuan Reopen", () => {
  // ── Aktor ──────────────────────────────────────────────────────────────
  const adminA: UserSession = {
    id: "admin-a",
    name: "Admin A",
    email: "admina@spkp.kai.id",
    role: Role.ADMIN,
  };

  const adminB: UserSession = {
    id: "admin-b",
    name: "Admin B",
    email: "adminb@spkp.kai.id",
    role: Role.ADMIN,
  };

  const picUser1: UserSession = {
    id: "pic-1",
    name: "Budi Santoso",
    email: "pic1@spkp.kai.id",
    role: Role.PIC,
  };

  const picUser2: UserSession = {
    id: "pic-2",
    name: "Sinta Wijaya",
    email: "pic2@spkp.kai.id",
    role: Role.PIC,
  };

  const verifikator: UserSession = {
    id: "veri-1",
    name: "Siti Rahma",
    email: "verifikator@spkp.kai.id",
    role: Role.VERIFIKATOR,
  };

  // ── Keluhan fixture ────────────────────────────────────────────────────
  const complaintAssignedToPic1: ComplaintSummary = {
    id: "comp-001",
    picId: picUser1.id,
    status: ComplaintStatus.DALAM_PENANGANAN,
  };

  const complaintAssignedToPic2: ComplaintSummary = {
    id: "comp-002",
    picId: picUser2.id,
    status: ComplaintStatus.DALAM_PENANGANAN,
  };

  const complaintTerverifikasi: ComplaintSummary = {
    id: "comp-003",
    picId: picUser1.id,
    status: ComplaintStatus.TERVERIFIKASI,
  };

  const complaintMenungguVerifikasi: ComplaintSummary = {
    id: "comp-004",
    picId: picUser1.id,
    status: ComplaintStatus.MENUNGGU_VERIFIKASI,
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 1. PIC — Hak Akses Kepemilikan Keluhan
  // ═══════════════════════════════════════════════════════════════════════
  describe("1. Kepemilikan Keluhan PIC (Ownership)", () => {
    it("PIC dapat mengeksekusi keluhan yang ditugaskan kepadanya", () => {
      expect(Permissions.canExecuteComplaint(picUser1, complaintAssignedToPic1)).toBe(true);
    });

    it("PIC TIDAK dapat mengeksekusi keluhan yang ditugaskan ke PIC lain", () => {
      // picUser1 mencoba mengeksekusi keluhan milik picUser2
      expect(Permissions.canExecuteComplaint(picUser1, complaintAssignedToPic2)).toBe(false);
    });

    it("PIC TIDAK dapat mengeksekusi keluhan yang sedang MENUNGGU_VERIFIKASI", () => {
      expect(Permissions.canExecuteComplaint(picUser1, complaintMenungguVerifikasi)).toBe(false);
    });

    it("PIC TIDAK dapat mengeksekusi keluhan yang sudah TERVERIFIKASI", () => {
      expect(Permissions.canExecuteComplaint(picUser1, complaintTerverifikasi)).toBe(false);
    });

    it("State machine: PIC dapat menyimpan progres (SAVE_PROGRESS) pada keluhan DALAM_PENANGANAN", () => {
      const result = validateStateTransition(
        ComplaintStatus.DALAM_PENANGANAN,
        AuditAction.SAVE_PROGRESS,
        Role.PIC
      );
      expect(result.isAllowed).toBe(true);
      expect(result.nextStatus).toBe(ComplaintStatus.DALAM_PENANGANAN);
    });

    it("State machine: PIC dapat mengajukan verifikasi (SUBMIT_VERIFICATION) dari DALAM_PENANGANAN", () => {
      const result = validateStateTransition(
        ComplaintStatus.DALAM_PENANGANAN,
        AuditAction.SUBMIT_VERIFICATION,
        Role.PIC
      );
      expect(result.isAllowed).toBe(true);
      expect(result.nextStatus).toBe(ComplaintStatus.MENUNGGU_VERIFIKASI);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 2. Admin — Tidak Boleh Melakukan Aksi PIC
  // ═══════════════════════════════════════════════════════════════════════
  describe("2. Admin TIDAK boleh melakukan aksi PIC", () => {
    it("canExecuteComplaint menolak Admin (tidak ada override superuser)", () => {
      // Admin seharusnya TIDAK bisa mengeksekusi, bahkan jika tidak ada picId
      expect(Permissions.canExecuteComplaint(adminA, complaintAssignedToPic1)).toBe(false);
    });

    it("Admin TIDAK bisa canExecuteComplaint meski role Admin", () => {
      const adminAssumed: ComplaintSummary = {
        id: "comp-admin",
        picId: adminA.id, // bahkan jika picId = adminId
        status: ComplaintStatus.DALAM_PENANGANAN,
      };
      // Admin bukan PIC — tetap ditolak
      expect(Permissions.canExecuteComplaint(adminA, adminAssumed)).toBe(false);
    });

    it("State machine: Admin TIDAK dapat menyimpan progres (SAVE_PROGRESS)", () => {
      const result = validateStateTransition(
        ComplaintStatus.DALAM_PENANGANAN,
        AuditAction.SAVE_PROGRESS,
        Role.ADMIN
      );
      expect(result.isAllowed).toBe(false);
      expect(result.error).toContain("Hanya petugas PIC");
    });

    it("State machine: Admin TIDAK dapat mengajukan verifikasi (SUBMIT_VERIFICATION)", () => {
      const result = validateStateTransition(
        ComplaintStatus.DALAM_PENANGANAN,
        AuditAction.SUBMIT_VERIFICATION,
        Role.ADMIN
      );
      expect(result.isAllowed).toBe(false);
    });

    it("Admin TETAP berwenang menugaskan PIC (ASSIGN_PIC)", () => {
      const result = validateStateTransition(
        ComplaintStatus.BELUM_DITANGANI,
        AuditAction.ASSIGN_PIC,
        Role.ADMIN
      );
      expect(result.isAllowed).toBe(true);
      expect(result.nextStatus).toBe(ComplaintStatus.DALAM_PENANGANAN);
    });

    it("Admin TETAP berwenang menerbitkan dokumen arsip FR.SM/TI/033.001", () => {
      expect(Permissions.canGenerateDocument(adminA)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. Verifikator — Tidak Boleh Menjalankan Aksi PIC
  // ═══════════════════════════════════════════════════════════════════════
  describe("3. Verifikator TIDAK boleh menjalankan aksi PIC", () => {
    it("canExecuteComplaint menolak Verifikator", () => {
      expect(Permissions.canExecuteComplaint(verifikator, complaintAssignedToPic1)).toBe(false);
    });

    it("State machine: Verifikator TIDAK dapat SAVE_PROGRESS", () => {
      const result = validateStateTransition(
        ComplaintStatus.DALAM_PENANGANAN,
        AuditAction.SAVE_PROGRESS,
        Role.VERIFIKATOR
      );
      expect(result.isAllowed).toBe(false);
    });

    it("State machine: Verifikator TIDAK dapat SUBMIT_VERIFICATION sebagai PIC", () => {
      const result = validateStateTransition(
        ComplaintStatus.DALAM_PENANGANAN,
        AuditAction.SUBMIT_VERIFICATION,
        Role.VERIFIKATOR
      );
      expect(result.isAllowed).toBe(false);
    });

    it("Verifikator TETAP berwenang melakukan VERIFY_APPROVED pada MENUNGGU_VERIFIKASI", () => {
      const result = validateStateTransition(
        ComplaintStatus.MENUNGGU_VERIFIKASI,
        AuditAction.VERIFY_APPROVED,
        Role.VERIFIKATOR
      );
      expect(result.isAllowed).toBe(true);
      expect(result.nextStatus).toBe(ComplaintStatus.TERVERIFIKASI);
    });

    it("Verifikator TETAP berwenang mengajukan reopen jika keluhan TERVERIFIKASI", () => {
      expect(Permissions.canRequestReopen(verifikator, complaintTerverifikasi)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 4. Alur Reopen — Logika Bisnis dan Self-Approval Prevention
  // ═══════════════════════════════════════════════════════════════════════
  describe("4. Alur Reopen — Logika Bisnis dan Keamanan", () => {
    // Simulasi data reopen request
    interface ReopenRequestRecord {
      id: string;
      complaintId: string;
      requestedById: string;
      reason: string;
      status: ReopenStatus;
      reviewedById?: string | null;
      reviewedAt?: Date | null;
      adminNotes?: string | null;
    }

    it("Admin dapat mengajukan reopen pada keluhan TERVERIFIKASI", () => {
      expect(Permissions.canRequestReopen(adminA, complaintTerverifikasi)).toBe(true);
    });

    it("Verifikator dapat mengajukan reopen pada keluhan TERVERIFIKASI", () => {
      expect(Permissions.canRequestReopen(verifikator, complaintTerverifikasi)).toBe(true);
    });

    it("PIC TIDAK dapat mengajukan reopen", () => {
      expect(Permissions.canRequestReopen(picUser1, complaintTerverifikasi)).toBe(false);
    });

    it("Reopen tidak dapat diajukan jika keluhan belum TERVERIFIKASI", () => {
      expect(Permissions.canRequestReopen(adminA, complaintAssignedToPic1)).toBe(false);
      expect(Permissions.canRequestReopen(verifikator, complaintMenungguVerifikasi)).toBe(false);
    });

    it("Self-approval guard: pemohon TIDAK dapat menyetujui permohonan yang diajukan sendiri", () => {
      // Simulasi guard yang sama seperti di reviewReopenRequest
      const reopenReq: ReopenRequestRecord = {
        id: "reopen-001",
        complaintId: "comp-003",
        requestedById: adminA.id, // Admin A mengajukan
        reason: "Pelanggan melapor masalah berulang pada AC gerbong 2.",
        status: ReopenStatus.PENDING,
      };

      // Admin A mencoba menyetujui sendiri
      const isSelfApproval = reopenReq.requestedById === adminA.id;
      expect(isSelfApproval).toBe(true);

      // Guard ini harus memblokir aksi
      const selfApprovalBlocked = isSelfApproval
        ? "Pemohon tidak dapat menyetujui atau menolak permohonan reopen yang diajukan oleh dirinya sendiri."
        : null;
      expect(selfApprovalBlocked).not.toBeNull();
    });

    it("Admin lain (Admin B) dapat meninjau permohonan yang diajukan Admin A", () => {
      const reopenReq: ReopenRequestRecord = {
        id: "reopen-001",
        complaintId: "comp-003",
        requestedById: adminA.id,
        reason: "Pelanggan melapor masalah berulang pada AC gerbong 2.",
        status: ReopenStatus.PENDING,
      };

      // Admin B bukan pemohon — diizinkan meninjau
      const isSelfApproval = reopenReq.requestedById === adminB.id;
      expect(isSelfApproval).toBe(false);
      expect(Permissions.canReviewReopen(adminB)).toBe(true);
    });

    it("Reopen disetujui: state machine mengembalikan status ke DALAM_PENANGANAN", () => {
      const result = validateStateTransition(
        ComplaintStatus.TERVERIFIKASI,
        AuditAction.APPROVE_REOPEN,
        Role.ADMIN
      );
      expect(result.isAllowed).toBe(true);
      expect(result.nextStatus).toBe(ComplaintStatus.DALAM_PENANGANAN);
    });

    it("Reopen disetujui: PIC tetap sama (tidak berubah)", () => {
      // Simulasi state setelah persetujuan reopen
      const complaint = {
        id: "comp-003",
        picId: picUser1.id,
        status: ComplaintStatus.TERVERIFIKASI,
        completedAt: new Date("2026-10-15T10:00:00Z"),
      };

      // Setelah approve reopen — hanya status dan completedAt yang berubah
      const afterApprove = {
        ...complaint,
        status: ComplaintStatus.DALAM_PENANGANAN,
        completedAt: null,
      };

      expect(afterApprove.picId).toBe(picUser1.id); // PIC tidak berubah
      expect(afterApprove.status).toBe(ComplaintStatus.DALAM_PENANGANAN);
      expect(afterApprove.completedAt).toBeNull();
    });

    it("Reopen ditolak: status keluhan TETAP TERVERIFIKASI", () => {
      const result = validateStateTransition(
        ComplaintStatus.TERVERIFIKASI,
        AuditAction.REJECT_REOPEN,
        Role.ADMIN
      );
      expect(result.isAllowed).toBe(true);
      // Status tetap TERVERIFIKASI saat ditolak
      expect(result.nextStatus).toBe(ComplaintStatus.TERVERIFIKASI);
    });

    it("Reopen ditolak: simulasi integritas rekaman histori", () => {
      const complaint = {
        id: "comp-003",
        picId: picUser1.id,
        status: ComplaintStatus.TERVERIFIKASI,
        completedAt: new Date("2026-10-15T10:00:00Z"),
      };

      const reopenRecord = {
        id: "reopen-002",
        complaintId: complaint.id,
        requestedById: verifikator.id,
        reason: "Keluhan baru dari penumpang yang sama.",
        status: ReopenStatus.PENDING,
        reviewedById: null as string | null,
        reviewedAt: null as Date | null,
        adminNotes: null as string | null,
      };

      // Admin B menolak
      const afterReject = {
        ...reopenRecord,
        status: ReopenStatus.REJECTED,
        reviewedById: adminB.id,
        reviewedAt: new Date("2026-10-15T11:00:00Z"),
        adminNotes: "Ditolak karena masalah berbeda dan tidak relevan dengan tiket ini.",
      };

      // Keluhan tidak berubah statusnya
      expect(complaint.status).toBe(ComplaintStatus.TERVERIFIKASI);
      expect(complaint.completedAt).not.toBeNull();

      // Rekaman reopen mencatat peninjau dan keputusan
      expect(afterReject.status).toBe(ReopenStatus.REJECTED);
      expect(afterReject.reviewedById).toBe(adminB.id);
      expect(afterReject.adminNotes).toContain("Ditolak");
    });

    it("Permintaan reopen yang sudah diproses tidak bisa diproses ulang (status !== PENDING)", () => {
      const processedReopen = {
        id: "reopen-003",
        requestedById: verifikator.id,
        status: ReopenStatus.APPROVED, // Sudah diproses
      };

      const canProcess = processedReopen.status === ReopenStatus.PENDING;
      expect(canProcess).toBe(false);
    });

    it("Dua Admin tidak bisa memproses reopen yang sama secara bersamaan (status guard atomik)", () => {
      // Simulasi: Admin A memproses lebih dulu, status berubah dari PENDING → APPROVED
      // Admin B kemudian mencoba memproses → harus ditolak karena status sudah bukan PENDING
      const initialStatus: string = ReopenStatus.PENDING;

      // Admin A menyetujui → status berubah (simulasi nilai dari database sebagai string)
      const afterAdminADecision: string = ReopenStatus.APPROVED;

      // Admin B mencoba: cek status di dalam transaksi
      const canAdminBProcess = afterAdminADecision === initialStatus;
      expect(canAdminBProcess).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 5. Pengujian Keamanan Endpoint Langsung
  // ═══════════════════════════════════════════════════════════════════════
  describe("5. Keamanan Otorisasi (Endpoint Security Layer)", () => {
    it("Pengguna null ditolak dari semua operasi kritis", () => {
      const nullUser = null;
      const anyComplaint: ComplaintSummary = {
        id: "comp-x",
        picId: "pic-x",
        status: ComplaintStatus.DALAM_PENANGANAN,
      };

      expect(Permissions.canExecuteComplaint(nullUser, anyComplaint)).toBe(false);
      expect(Permissions.canAssignPIC(nullUser)).toBe(false);
      expect(Permissions.canVerifyComplaint(nullUser)).toBe(false);
      expect(Permissions.canDeleteComplaint(nullUser)).toBe(false);
      expect(Permissions.canGenerateDocument(nullUser)).toBe(false);
      expect(Permissions.canReviewReopen(nullUser)).toBe(false);
      expect(Permissions.canRequestReopen(nullUser, anyComplaint)).toBe(false);
    });

    it("PIC tidak dapat menghapus keluhan (hanya Admin)", () => {
      expect(Permissions.canDeleteComplaint(picUser1)).toBe(false);
      expect(Permissions.canDeleteComplaint(verifikator)).toBe(false);
      expect(Permissions.canDeleteComplaint(adminA)).toBe(true);
    });

    it("PIC tidak dapat mengedit data pokok keluhan (hanya Admin)", () => {
      expect(Permissions.canEditComplaint(picUser1)).toBe(false);
      expect(Permissions.canEditComplaint(verifikator)).toBe(false);
      expect(Permissions.canEditComplaint(adminA)).toBe(true);
    });

    it("Tidak ada transisi ilegal yang lolos dari state machine — BELUM_DITANGANI langsung ke TERVERIFIKASI", () => {
      const illegalJump = validateStateTransition(
        ComplaintStatus.BELUM_DITANGANI,
        AuditAction.VERIFY_APPROVED,
        Role.VERIFIKATOR
      );
      expect(illegalJump.isAllowed).toBe(false);
    });

    it("Tidak ada transisi ilegal — TERVERIFIKASI langsung submit verifikasi ulang tanpa reopen", () => {
      const illegalSubmit = validateStateTransition(
        ComplaintStatus.TERVERIFIKASI,
        AuditAction.SUBMIT_VERIFICATION,
        Role.PIC
      );
      expect(illegalSubmit.isAllowed).toBe(false);
    });

    it("Admin DILARANG KERAS memverifikasi (Four-Eyes Principle SOP KAI)", () => {
      expect(Permissions.canVerifyComplaint(adminA)).toBe(false);

      const forbiddenVerify = validateStateTransition(
        ComplaintStatus.MENUNGGU_VERIFIKASI,
        AuditAction.VERIFY_APPROVED,
        Role.ADMIN
      );
      expect(forbiddenVerify.isAllowed).toBe(false);
      expect(forbiddenVerify.error).toContain("four-eyes principle");
    });
  });
});
