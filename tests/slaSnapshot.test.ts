import { describe, it, expect } from "vitest";
import { computeSlaSnapshot } from "@/lib/slaSnapshot";

// 23 November 2026 adalah hari Senin. Waktu ditulis dalam WIB.
const wib = (text: string) => new Date(`${text.replace(" ", "T")}:00+07:00`);

describe("computeSlaSnapshot (SLA hari kerja)", () => {
  it("24 jam = 1 hari kerja: Senin 09:00 jatuh pada Selasa 09:00", () => {
    const r = computeSlaSnapshot(wib("2026-11-23 09:00"));
    expect(r.slaHours).toBe(24);
    expect(r.slaDeadlineInitial.toISOString()).toBe(wib("2026-11-24 09:00").toISOString());
  });

  it("48 jam = 2 hari kerja: Senin 14:05:45 jatuh pada Rabu 14:05:45", () => {
    const start = new Date("2026-11-23T07:05:45.130Z");
    const r = computeSlaSnapshot(start, 48);
    expect(r.slaDeadlineInitial.toISOString()).toBe("2026-11-25T07:05:45.130Z");
  });

  it("deadline efektif sama dengan deadline awal saat keluhan baru dicatat", () => {
    const r = computeSlaSnapshot(wib("2026-11-23 09:00"), 72);
    expect(r.slaDeadline.getTime()).toBe(r.slaDeadlineInitial.getTime());
  });

  it("dicatat Jumat melewati akhir pekan", () => {
    const r = computeSlaSnapshot(wib("2026-11-27 16:00"), 24);
    expect(r.slaDeadlineInitial.toISOString()).toBe(wib("2026-11-30 16:00").toISOString());
  });

  it("dicatat di akhir pekan: hari kerja pertama sesudahnya dihitung hari ke-1", () => {
    const r = computeSlaSnapshot(wib("2026-11-28 10:00"), 24);
    expect(r.slaDeadlineInitial.toISOString()).toBe(wib("2026-11-30 10:00").toISOString());
  });

  it("hari libur tidak dihitung", () => {
    const r = computeSlaSnapshot(wib("2026-11-23 16:00"), 24, ["2026-11-24"]);
    expect(r.slaDeadlineInitial.toISOString()).toBe(wib("2026-11-25 16:00").toISOString());
  });

  it("tidak mengubah objek waktu awal dan mencatat awal hitungan", () => {
    const start = wib("2026-11-23 09:00");
    const before = start.getTime();
    const r = computeSlaSnapshot(start, 120);
    expect(start.getTime()).toBe(before);
    expect(r.slaStartAt.getTime()).toBe(before);
  });
});
