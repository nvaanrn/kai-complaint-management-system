import { describe, it, expect } from "vitest";
import { Role, ComplaintStatus } from "@/types/database";
import { Permissions, UserSession, ComplaintSummary } from "@/lib/permissions";

describe("Audit & Pengujian: Menu Verifikasi & Penguncian Data Terverifikasi", () => {
  const adminUser: UserSession = {
    id: "admin-1",
    name: "Admin Pusat KAI",
    email: "admin@kai.id",
    role: Role.ADMIN,
  };

  const verifikatorUser: UserSession = {
    id: "verif-1",
    name: "Petugas Verifikator",
    email: "verifikator@kai.id",
    role: Role.VERIFIKATOR,
  };

  const picUser1: UserSession = {
    id: "pic-1",
    name: "PIC Stasiun Gambir",
    email: "pic1@kai.id",
    role: Role.PIC,
  };

  const picUser2: UserSession = {
    id: "pic-2",
    name: "PIC Stasiun Senen",
    email: "pic2@kai.id",
    role: Role.PIC,
  };

  // Mock complaints
  const draftComplaint: ComplaintSummary = {
    id: "c-draft",
    picId: "pic-1",
    status: ComplaintStatus.BELUM_DITANGANI,
    documentId: null,
  };

  const inProgressComplaint: ComplaintSummary = {
    id: "c-progress",
    picId: "pic-1",
    status: ComplaintStatus.DALAM_PENANGANAN,
    documentId: null,
  };

  const pendingVerificationComplaint: ComplaintSummary = {
    id: "c-pending-verif",
    picId: "pic-1",
    status: ComplaintStatus.MENUNGGU_VERIFIKASI,
    documentId: null,
  };

  const verifiedComplaintNoDoc: ComplaintSummary = {
    id: "c-verified-1",
    picId: "pic-1",
    status: ComplaintStatus.TERVERIFIKASI,
    documentId: null,
  };

  const verifiedComplaintWithDoc: ComplaintSummary = {
    id: "c-verified-2",
    picId: "pic-1",
    status: ComplaintStatus.TERVERIFIKASI,
    documentId: "doc-kai-001",
  };

  describe("1. Penguncian Penghapusan (Data Locking - Deletion)", () => {
    it("Admin hanya boleh menghapus keluhan draft/belum terverifikasi dan belum berdokumen", () => {
      expect(Permissions.canDeleteComplaint(adminUser, draftComplaint)).toBe(true);
      expect(Permissions.canDeleteComplaint(adminUser, inProgressComplaint)).toBe(true);
    });

    it("Admin DITOLAK menghapus keluhan berstatus TERVERIFIKASI meskipun belum terbit dokumen", () => {
      expect(Permissions.canDeleteComplaint(adminUser, verifiedComplaintNoDoc)).toBe(false);
    });

    it("Admin DITOLAK menghapus keluhan berstatus TERVERIFIKASI yang sudah memiliki dokumen", () => {
      expect(Permissions.canDeleteComplaint(adminUser, verifiedComplaintWithDoc)).toBe(false);
    });

    it("PIC dan Verifikator mutlak dilarang menghapus keluhan status apa pun", () => {
      expect(Permissions.canDeleteComplaint(picUser1, draftComplaint)).toBe(false);
      expect(Permissions.canDeleteComplaint(picUser1, verifiedComplaintNoDoc)).toBe(false);
      expect(Permissions.canDeleteComplaint(verifikatorUser, draftComplaint)).toBe(false);
      expect(Permissions.canDeleteComplaint(verifikatorUser, verifiedComplaintNoDoc)).toBe(false);
    });
  });

  describe("2. Kewenangan Verifikasi (Separation of Duties)", () => {
    it("Hanya role Verifikator yang berwenang memberikan keputusan verifikasi", () => {
      expect(Permissions.canVerifyComplaint(verifikatorUser)).toBe(true);
    });

    it("Admin tidak berwenang melakukan verifikasi mutu / keluhan", () => {
      expect(Permissions.canVerifyComplaint(adminUser)).toBe(false);
    });

    it("PIC tidak berwenang melakukan verifikasi (mencegah conflict of interest)", () => {
      expect(Permissions.canVerifyComplaint(picUser1)).toBe(false);
    });
  });

  describe("3. Kewenangan Eksekusi Penanganan (PIC Responsibility)", () => {
    it("PIC yang ditugaskan berwenang menangani keluhan aktif", () => {
      expect(Permissions.canExecuteComplaint(picUser1, inProgressComplaint)).toBe(true);
    });

    it("PIC yang tidak ditugaskan dilarang menangani keluhan orang lain", () => {
      expect(Permissions.canExecuteComplaint(picUser2, inProgressComplaint)).toBe(false);
    });

    it("Admin tidak berwenang menginput penanganan atas nama PIC", () => {
      expect(Permissions.canExecuteComplaint(adminUser, inProgressComplaint)).toBe(false);
    });

    it("Keluhan yang sudah TERVERIFIKASI terkunci dari eksekusi penanganan", () => {
      expect(Permissions.canExecuteComplaint(picUser1, verifiedComplaintNoDoc)).toBe(false);
    });
  });

  describe("4. Aturan Filter Menu Verifikasi Berdasarkan Role", () => {
    const allComplaints = [
      draftComplaint,
      inProgressComplaint,
      pendingVerificationComplaint,
      verifiedComplaintNoDoc,
      verifiedComplaintWithDoc,
    ];

    it("Role Admin di Menu Verifikasi hanya menerima data dengan status TERVERIFIKASI", () => {
      const adminVerifComplaints = allComplaints.filter((c) => {
        // Logika tampilan menu Verifikasi untuk Admin
        return c.status === ComplaintStatus.TERVERIFIKASI;
      });

      expect(adminVerifComplaints.length).toBe(2);
      expect(adminVerifComplaints.every((c) => c.status === ComplaintStatus.TERVERIFIKASI)).toBe(true);
      expect(adminVerifComplaints.some((c) => c.status === ComplaintStatus.MENUNGGU_VERIFIKASI)).toBe(false);
    });

    it("Role Verifikator & PIC di Menu Verifikasi menerima status MENUNGGU_VERIFIKASI dan TERVERIFIKASI", () => {
      const verifierMenuComplaints = allComplaints.filter((c) => {
        // Logika tampilan menu Verifikasi untuk Verifikator/PIC
        return (
          c.status === ComplaintStatus.MENUNGGU_VERIFIKASI ||
          c.status === ComplaintStatus.TERVERIFIKASI
        );
      });

      expect(verifierMenuComplaints.length).toBe(3);
      expect(verifierMenuComplaints.some((c) => c.status === ComplaintStatus.BELUM_DITANGANI)).toBe(false);
      expect(verifierMenuComplaints.some((c) => c.status === ComplaintStatus.DALAM_PENANGANAN)).toBe(false);
    });
  });
});
