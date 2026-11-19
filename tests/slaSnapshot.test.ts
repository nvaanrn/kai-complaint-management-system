import { describe, it, expect } from "vitest";
import { computeSlaSnapshot } from "@/lib/slaSnapshot";

describe("computeSlaSnapshot", () => {
  it("deadline = start + 24 jam secara default", () => {
    const start = new Date("2026-11-19T03:00:00.000Z");
    const r = computeSlaSnapshot(start);
    expect(r.slaHours).toBe(24);
    expect(r.slaDeadlineInitial.toISOString()).toBe("2026-11-20T03:00:00.000Z");
    expect(r.slaDeadline.getTime()).toBe(r.slaDeadlineInitial.getTime());
  });

  it("memakai slaHours kustom", () => {
    const r = computeSlaSnapshot(new Date("2026-11-19T00:00:00.000Z"), 48);
    expect(r.slaDeadlineInitial.toISOString()).toBe("2026-11-21T00:00:00.000Z");
  });

  it("tidak mengubah objek start asli", () => {
    const start = new Date("2026-11-19T00:00:00.000Z");
    const before = start.getTime();
    computeSlaSnapshot(start);
    expect(start.getTime()).toBe(before);
  });
});