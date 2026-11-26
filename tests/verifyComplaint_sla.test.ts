import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  transaction: vi.fn(),
  tx: {
    complaint: { findUnique: vi.fn(), update: vi.fn() },
    verification: { create: vi.fn() },
    slaExtension: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    holiday: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: (fn: (tx: unknown) => unknown) => mocks.transaction(fn) },
}));

import { verifyComplaint } from "@/app/actions/complaints";
import { ComplaintStatus, Role, VerificationResult } from "@/types/database";

const verifikator = { id: "u-ver", name: "Verifikator", nipp: "9987459003", role: Role.VERIFIKATOR };
const pic = { id: "u-pic", name: "PIC", nipp: "9987459002", role: Role.PIC };
const FEEDBACK = "Foto bukti belum jelas, mohon diperbaiki.";

// Senin 23 November 2026 pukul 14:05:45.130 WIB
const NOW = new Date("2026-11-23T07:05:45.130Z");

describe("verifyComplaint: perpanjangan SLA saat penolakan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    mocks.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(mocks.tx));
    mocks.getCurrentUser.mockResolvedValue(verifikator);
    mocks.tx.complaint.findUnique.mockResolvedValue({
      id: "c1",
      status: ComplaintStatus.MENUNGGU_VERIFIKASI,
      picId: "u-pic",
      complaintNumber: "CMP-2026-010",
      submissionCount: 1,
    });
    mocks.tx.verification.create.mockResolvedValue({ id: "v1" });
    mocks.tx.complaint.update.mockResolvedValue({ id: "c1" });
    mocks.tx.slaExtension.create.mockResolvedValue({});
    mocks.tx.auditLog.create.mockResolvedValue({});
    mocks.tx.holiday.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("penolakan mencatat perpanjangan dan memajukan tenggat efektif sesuai hari kerja", async () => {
    const res = await verifyComplaint("c1", {
      result: VerificationResult.REJECTED,
      feedback: FEEDBACK,
      extraWorkingDays: 2,
    });
    expect(res.success).toBe(true);
    expect(mocks.tx.slaExtension.create).toHaveBeenCalledWith({
      data: {
        complaintId: "c1",
        verificationId: "v1",
        extraWorkingDays: 2,
        rejectedAt: NOW,
        newDeadline: new Date("2026-11-25T07:05:45.130Z"), // Rabu, jam sama
      },
    });
    const updateArg = mocks.tx.complaint.update.mock.calls[0][0];
    expect(updateArg.data.slaDeadline).toEqual(new Date("2026-11-25T07:05:45.130Z"));
    expect(updateArg.data.status).toBe(ComplaintStatus.DALAM_PENANGANAN);
    // tenggat awal tidak pernah diubah
    expect(updateArg.data).not.toHaveProperty("slaDeadlineInitial");
  });

  it("hari libur dilewati saat menghitung tenggat baru", async () => {
    mocks.tx.holiday.findMany.mockResolvedValue([{ date: new Date("2026-11-24T00:00:00.000Z") }]);
    await verifyComplaint("c1", {
      result: VerificationResult.REJECTED,
      feedback: FEEDBACK,
      extraWorkingDays: 1,
    });
    const updateArg = mocks.tx.complaint.update.mock.calls[0][0];
    expect(updateArg.data.slaDeadline).toEqual(new Date("2026-11-25T07:05:45.130Z")); // Selasa libur, jadi Rabu
  });

  it("menolak penolakan tanpa tambahan waktu atau dengan nilai tidak valid", async () => {
    for (const bad of [undefined, 0, -1, 1.5, 31]) {
      const res = await verifyComplaint("c1", {
        result: VerificationResult.REJECTED,
        feedback: FEEDBACK,
        extraWorkingDays: bad as number | undefined,
      });
      expect(res.success).toBe(false);
      expect(res.code).toBe("VALIDATION_ERROR");
    }
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.tx.slaExtension.create).not.toHaveBeenCalled();
  });

  it("persetujuan tidak membuat perpanjangan dan tidak mengubah tenggat", async () => {
    const res = await verifyComplaint("c1", { result: VerificationResult.APPROVED, feedback: "Sudah sesuai." });
    expect(res.success).toBe(true);
    expect(mocks.tx.slaExtension.create).not.toHaveBeenCalled();
    const updateArg = mocks.tx.complaint.update.mock.calls[0][0];
    expect(updateArg.data).not.toHaveProperty("slaDeadline");
  });

  it("hanya Verifikator yang boleh menolak", async () => {
    mocks.getCurrentUser.mockResolvedValue(pic);
    const res = await verifyComplaint("c1", {
      result: VerificationResult.REJECTED,
      feedback: FEEDBACK,
      extraWorkingDays: 2,
    });
    expect(res.success).toBe(false);
    expect(mocks.tx.slaExtension.create).not.toHaveBeenCalled();
  });

  it("keluhan yang tidak berstatus menunggu verifikasi tidak dapat ditolak", async () => {
    mocks.tx.complaint.findUnique.mockResolvedValue({
      id: "c1",
      status: ComplaintStatus.DALAM_PENANGANAN,
      picId: "u-pic",
      complaintNumber: "CMP-2026-010",
      submissionCount: 1,
    });
    const res = await verifyComplaint("c1", {
      result: VerificationResult.REJECTED,
      feedback: FEEDBACK,
      extraWorkingDays: 2,
    });
    expect(res.success).toBe(false);
    expect(mocks.tx.slaExtension.create).not.toHaveBeenCalled();
  });
});
