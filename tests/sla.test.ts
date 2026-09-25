import { describe, it, expect } from "vitest";
import { calculateSla } from "@/lib/sla";

describe("Unit Test: SLA Calculation (calculateSla)", () => {
  const ONE_HOUR = 60 * 60 * 1000;
  const BASE_TIME = new Date("2026-09-25T10:00:00.000Z").getTime();

  it("harus menghitung keluhan aktif yang masih dalam batas SLA 24 jam", () => {
    // Keluhan dibuat 4 jam yang lalu
    const complaintDate = new Date(BASE_TIME - 4 * ONE_HOUR).toISOString();

    const res = calculateSla({
      date: complaintDate,
      status: "DALAM_PENANGANAN",
      now: BASE_TIME,
    });

    expect(res.isOverdue).toBe(false);
    expect(res.isMet).toBe(true);
    expect(res.badgeVariant).toBe("neutral");
    expect(res.remainingHours).toBe(20);
    expect(res.statusText).toContain("Aktif (Sisa 20 Jam)");
  });

  it("harus menandai keluhan aktif yang telah melewati batas 24 jam sebagai Overdue", () => {
    // Keluhan dibuat 28 jam yang lalu
    const complaintDate = new Date(BASE_TIME - 28 * ONE_HOUR).toISOString();

    const res = calculateSla({
      date: complaintDate,
      status: "BELUM_DITANGANI",
      now: BASE_TIME,
    });

    expect(res.isOverdue).toBe(true);
    expect(res.isMet).toBe(false);
    expect(res.badgeVariant).toBe("danger");
    expect(res.remainingHours).toBe(0);
    expect(res.statusText).toBe("Terlambat / Overdue (+4 Jam)");
  });

  it("harus mengakui penyelesaian tepat waktu jika diselesaikan dalam batas 24 jam", () => {
    // Keluhan dibuat pukul 08:00, disubmit verifikasi pukul 16:00 (8 jam)
    const complaintDate = new Date("2026-09-25T08:00:00.000Z").toISOString();
    const submittedAt = new Date("2026-09-25T16:00:00.000Z").toISOString();

    const res = calculateSla({
      date: complaintDate,
      status: "MENUNGGU_VERIFIKASI",
      submittedAt: submittedAt,
      now: BASE_TIME,
    });

    expect(res.isOverdue).toBe(false);
    expect(res.isMet).toBe(true);
    expect(res.badgeVariant).toBe("success");
    expect(res.statusText).toBe("Terpenuhi (8 Jam)");
  });

  it("harus menandai penyelesaian yang melebihi batas waktu 24 jam", () => {
    // Keluhan dibuat tanggal 23, disubmit tanggal 25 (30 jam selisih)
    const complaintDate = new Date("2026-09-23T10:00:00.000Z").toISOString();
    const submittedAt = new Date("2026-09-24T16:00:00.000Z").toISOString(); // 30 jam kemudian

    const res = calculateSla({
      date: complaintDate,
      status: "SELESAI",
      submittedAt: submittedAt,
      now: BASE_TIME,
    });

    expect(res.isOverdue).toBe(true);
    expect(res.isMet).toBe(false);
    expect(res.badgeVariant).toBe("warning");
    expect(res.statusText).toBe("Melewati Batas (+6 Jam)");
  });
});
