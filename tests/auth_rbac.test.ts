import { describe, it, expect } from "vitest";
import { Role } from "@/types/database";
import { Permissions, UserSession, ComplaintSummary } from "@/lib/permissions";

describe("Unit Test: Role-Based Access Control (RBAC Permissions)", () => {
  const adminUser: UserSession = {
    id: "user-admin-1",
    name: "Admin CS KAI",
    email: "admin@kai.id",
    role: Role.ADMIN,
  };

  const picUser1: UserSession = {
    id: "user-pic-1",
    name: "Petugas Lapangan 1",
    email: "pic1@kai.id",
    role: Role.PIC,
  };

  const picUser2: UserSession = {
    id: "user-pic-2",
    name: "Petugas Lapangan 2",
    email: "pic2@kai.id",
    role: Role.PIC,
  };

  const verifikatorUser: UserSession = {
    id: "user-veri-1",
    name: "Verifikator Mutu",
    email: "verifikator@kai.id",
    role: Role.VERIFIKATOR,
  };

  const complaintAssignedToPic1: ComplaintSummary = {
    id: "complaint-101",
    picId: "user-pic-1",
    status: "DALAM_PENANGANAN",
  };

  describe("Kewenangan Penugasan PIC (canAssignPIC)", () => {
    it("Admin diizinkan menugaskan PIC", () => {
      expect(Permissions.canAssignPIC(adminUser)).toBe(true);
    });

    it("PIC tidak boleh menentukan penugasan PIC", () => {
      expect(Permissions.canAssignPIC(picUser1)).toBe(false);
    });

    it("Verifikator tidak boleh menentukan penugasan PIC", () => {
      expect(Permissions.canAssignPIC(verifikatorUser)).toBe(false);
    });

    it("User tanpa sesi login (null) ditolak", () => {
      expect(Permissions.canAssignPIC(null)).toBe(false);
    });
  });

  describe("Kewenangan Eksekusi Penanganan Keluhan (canExecuteComplaint)", () => {
    it("PIC yang ditugaskan berwenang menginput hasil penanganan", () => {
      expect(Permissions.canExecuteComplaint(picUser1, complaintAssignedToPic1)).toBe(true);
    });

    it("PIC lain yang TIDAK ditugaskan dilarang menginput penanganan keluhan ini", () => {
      expect(Permissions.canExecuteComplaint(picUser2, complaintAssignedToPic1)).toBe(false);
    });

    it("Verifikator dilarang menginput hasil eksekusi penanganan", () => {
      expect(Permissions.canExecuteComplaint(verifikatorUser, complaintAssignedToPic1)).toBe(false);
    });

    it("Admin memiliki hak override untuk mengeksekusi bila darurat", () => {
      expect(Permissions.canExecuteComplaint(adminUser, complaintAssignedToPic1)).toBe(true);
    });
  });

  describe("Kewenangan Verifikasi Hasil Penanganan (canVerifyComplaint)", () => {
    it("Verifikator berwenang memverifikasi keluhan", () => {
      expect(Permissions.canVerifyComplaint(verifikatorUser)).toBe(true);
    });

    it("PIC dilarang memverifikasi pekerjaan sendiri (konflik kepentingan)", () => {
      expect(Permissions.canVerifyComplaint(picUser1)).toBe(false);
    });

    it("Admin berwenang memverifikasi sebagai supervisor", () => {
      expect(Permissions.canVerifyComplaint(adminUser)).toBe(true);
    });

    it("User anonim ditolak verifikasi", () => {
      expect(Permissions.canVerifyComplaint(null)).toBe(false);
    });
  });

  describe("Kewenangan Edit & Hapus Keluhan Pokok", () => {
    it("Hanya Admin yang berwenang mengedit pokok keluhan", () => {
      expect(Permissions.canEditComplaint(adminUser)).toBe(true);
      expect(Permissions.canEditComplaint(picUser1)).toBe(false);
      expect(Permissions.canEditComplaint(verifikatorUser)).toBe(false);
    });

    it("Hanya Admin yang berwenang menghapus keluhan", () => {
      expect(Permissions.canDeleteComplaint(adminUser)).toBe(true);
      expect(Permissions.canDeleteComplaint(picUser1)).toBe(false);
      expect(Permissions.canDeleteComplaint(verifikatorUser)).toBe(false);
    });
  });
});
