import { describe, it, expect } from "vitest";
import { ComplaintStatus, Role, AuditAction } from "@/types/database";
import { validateStateTransition } from "@/lib/state-machine";
import { Permissions, UserSession, ComplaintSummary } from "@/lib/permissions";
import {
  validateReopenRequestInput,
  validateReopenReviewInput,
  validateComplaintInput,
} from "@/lib/validation";

describe("Unit & Integration Test: State Machine & Backend RBAC (Fase 4)", () => {
  const adminUser: UserSession = {
    id: "admin-1",
    name: "Admin CS KAI",
    email: "admin@spkp.kai.id",
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
    name: "Joko Anwar",
    email: "pic2@spkp.kai.id",
    role: Role.PIC,
  };

  const verifikatorUser: UserSession = {
    id: "veri-1",
    name: "Siti Rahma",
    email: "verifikator@spkp.kai.id",
    role: Role.VERIFIKATOR,
  };

  describe("1. Validasi Transisi State Machine (validateStateTransition)", () => {
    it("Admin dapat menugaskan PIC dari status BELUM_DITANGANI ke DALAM_PENANGANAN", () => {
      const res = validateStateTransition(
        ComplaintStatus.BELUM_DITANGANI,
        AuditAction.ASSIGN_PIC,
        Role.ADMIN
      );
      expect(res.isAllowed).toBe(true);
      expect(res.nextStatus).toBe(ComplaintStatus.DALAM_PENANGANAN);
    });

    it("PIC dilarang menugaskan PIC pada status BELUM_DITANGANI", () => {
      const res = validateStateTransition(
        ComplaintStatus.BELUM_DITANGANI,
        AuditAction.ASSIGN_PIC,
        Role.PIC
      );
      expect(res.isAllowed).toBe(false);
      expect(res.error).toBeDefined();
    });

    it("PIC dapat mengajukan verifikasi dari DALAM_PENANGANAN ke MENUNGGU_VERIFIKASI", () => {
      const res = validateStateTransition(
        ComplaintStatus.DALAM_PENANGANAN,
        AuditAction.SUBMIT_VERIFICATION,
        Role.PIC
      );
      expect(res.isAllowed).toBe(true);
      expect(res.nextStatus).toBe(ComplaintStatus.MENUNGGU_VERIFIKASI);
    });

    it("Verifikator dilarang submit penanganan PIC pada status DALAM_PENANGANAN", () => {
      const res = validateStateTransition(
        ComplaintStatus.DALAM_PENANGANAN,
        AuditAction.SUBMIT_VERIFICATION,
        Role.VERIFIKATOR
      );
      expect(res.isAllowed).toBe(false);
    });

    it("Verifikator berwenang menyetujui (APPROVED) keluhan di status MENUNGGU_VERIFIKASI ke TERVERIFIKASI", () => {
      const res = validateStateTransition(
        ComplaintStatus.MENUNGGU_VERIFIKASI,
        AuditAction.VERIFY_APPROVED,
        Role.VERIFIKATOR
      );
      expect(res.isAllowed).toBe(true);
      expect(res.nextStatus).toBe(ComplaintStatus.TERVERIFIKASI);
    });

    it("Admin DILARANG KERAS menyetujui (APPROVED) hasil verifikasi (four-eyes principle)", () => {
      const res = validateStateTransition(
        ComplaintStatus.MENUNGGU_VERIFIKASI,
        AuditAction.VERIFY_APPROVED,
        Role.ADMIN
      );
      expect(res.isAllowed).toBe(false);
      expect(res.error).toContain("four-eyes principle");
    });

    it("Verifikator menolak (REJECTED) keluhan mengembalikannya ke DALAM_PENANGANAN", () => {
      const res = validateStateTransition(
        ComplaintStatus.MENUNGGU_VERIFIKASI,
        AuditAction.VERIFY_REJECTED,
        Role.VERIFIKATOR
      );
      expect(res.isAllowed).toBe(true);
      expect(res.nextStatus).toBe(ComplaintStatus.DALAM_PENANGANAN);
    });

    it("PIC dilarang memverifikasi/menolak pekerjaan sendiri", () => {
      const res = validateStateTransition(
        ComplaintStatus.MENUNGGU_VERIFIKASI,
        AuditAction.VERIFY_APPROVED,
        Role.PIC
      );
      expect(res.isAllowed).toBe(false);
    });

    it("Loncatan status ilegal ditolak (BELUM_DITANGANI langsung ke TERVERIFIKASI)", () => {
      const res = validateStateTransition(
        ComplaintStatus.BELUM_DITANGANI,
        AuditAction.VERIFY_APPROVED,
        Role.VERIFIKATOR
      );
      expect(res.isAllowed).toBe(false);
    });

    it("Admin dapat menyetujui Reopen dari TERVERIFIKASI kembali ke DALAM_PENANGANAN", () => {
      const res = validateStateTransition(
        ComplaintStatus.TERVERIFIKASI,
        AuditAction.APPROVE_REOPEN,
        Role.ADMIN
      );
      expect(res.isAllowed).toBe(true);
      expect(res.nextStatus).toBe(ComplaintStatus.DALAM_PENANGANAN);
    });

    it("PIC dilarang menyetujui Reopen keluhan", () => {
      const res = validateStateTransition(
        ComplaintStatus.TERVERIFIKASI,
        AuditAction.APPROVE_REOPEN,
        Role.PIC
      );
      expect(res.isAllowed).toBe(false);
    });
  });

  describe("2. Hak Akses Kepemilikan & Status (Permissions Guard)", () => {
    it("PIC hanya boleh mengeksekusi keluhan yang ditugaskan kepada dirinya", () => {
      const myComplaint: ComplaintSummary = {
        id: "c-1",
        picId: "pic-1",
        status: ComplaintStatus.DALAM_PENANGANAN,
      };
      const othersComplaint: ComplaintSummary = {
        id: "c-2",
        picId: "pic-2",
        status: ComplaintStatus.DALAM_PENANGANAN,
      };

      expect(Permissions.canExecuteComplaint(picUser1, myComplaint)).toBe(true);
      expect(Permissions.canExecuteComplaint(picUser1, othersComplaint)).toBe(false);
    });

    it("PIC tidak dapat mengeksekusi keluhan yang sedang MENUNGGU_VERIFIKASI atau TERVERIFIKASI", () => {
      const lockedComplaint: ComplaintSummary = {
        id: "c-3",
        picId: "pic-1",
        status: ComplaintStatus.MENUNGGU_VERIFIKASI,
      };
      const finishedComplaint: ComplaintSummary = {
        id: "c-4",
        picId: "pic-1",
        status: ComplaintStatus.TERVERIFIKASI,
      };

      expect(Permissions.canExecuteComplaint(picUser1, lockedComplaint)).toBe(false);
      expect(Permissions.canExecuteComplaint(picUser1, finishedComplaint)).toBe(false);
    });

    it("Verifikator dan Admin berwenang mengajukan Reopen jika status TERVERIFIKASI", () => {
      const resolvedComplaint: ComplaintSummary = {
        id: "c-5",
        picId: "pic-1",
        status: ComplaintStatus.TERVERIFIKASI,
      };
      const activeComplaint: ComplaintSummary = {
        id: "c-6",
        picId: "pic-1",
        status: ComplaintStatus.DALAM_PENANGANAN,
      };

      expect(Permissions.canRequestReopen(verifikatorUser, resolvedComplaint)).toBe(true);
      expect(Permissions.canRequestReopen(adminUser, resolvedComplaint)).toBe(true);
      // Ditolak jika tiket belum terverifikasi
      expect(Permissions.canRequestReopen(verifikatorUser, activeComplaint)).toBe(false);
      // PIC dilarang mengajukan reopen
      expect(Permissions.canRequestReopen(picUser1, resolvedComplaint)).toBe(false);
    });

    it("Hanya Admin yang berwenang meninjau (approve/reject) Reopen", () => {
      expect(Permissions.canReviewReopen(adminUser)).toBe(true);
      expect(Permissions.canReviewReopen(verifikatorUser)).toBe(false);
      expect(Permissions.canReviewReopen(picUser1)).toBe(false);
    });

    it("Hanya Admin yang berwenang menerbitkan berkas audit FR.SM/TI/033.001", () => {
      expect(Permissions.canGenerateDocument(adminUser)).toBe(true);
      expect(Permissions.canGenerateDocument(picUser1)).toBe(false);
      expect(Permissions.canGenerateDocument(verifikatorUser)).toBe(false);
    });
  });

  describe("3. Validasi Input Reopen & Kategori (Validation Rules)", () => {
    it("harus menolak permohonan Reopen jika alasan kosong atau terlalu pendek", () => {
      const res1 = validateReopenRequestInput({ reason: "" });
      expect(res1.isValid).toBe(false);
      expect(res1.errors.reason).toBeDefined();

      const res2 = validateReopenRequestInput({ reason: "pendek" });
      expect(res2.isValid).toBe(false);
      expect(res2.errors.reason).toContain("minimal 10 karakter");
    });

    it("harus meloloskan permohonan Reopen jika alasan jelas dan memadai", () => {
      const res = validateReopenRequestInput({
        reason: "Penumpang kembali komplain karena AC gerbong 3 kembali mati di stasiun berikutnya.",
      });
      expect(res.isValid).toBe(true);
    });

    it("harus menolak peninjauan Reopen oleh Admin jika catatan pertimbangan kosong", () => {
      const res = validateReopenReviewInput({
        decision: "APPROVED",
        adminNotes: "",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.adminNotes).toBeDefined();
    });

    it("harus memvalidasi kategori keluhan sah sesuai enum", () => {
      const resValid = validateComplaintInput({
        customerName: "Raden Saleh",
        description: "Pintu otomatis stasiun macet dan berbunyi alarm",
        source: "Contact Center 121",
        category: "FASILITAS_STASIUN",
      });
      expect(resValid.isValid).toBe(true);

      const resInvalid = validateComplaintInput({
        customerName: "Raden Saleh",
        description: "Pintu otomatis stasiun macet dan berbunyi alarm",
        source: "Contact Center 121",
        category: "KATEGORI_PALSU_TIDAK_ADA",
      });
      expect(resInvalid.isValid).toBe(false);
      expect(resInvalid.errors.category).toBe("Kategori jenis keluhan tidak valid.");
    });
  });
});
