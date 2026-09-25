import { describe, it, expect } from "vitest";
import { formatComplaintNumber, parseNextSequence } from "@/lib/complaintNumber";

describe("Unit Test: Complaint Number Generation (complaintNumber)", () => {
  it("harus memformat nomor keluhan sesuai format KAI: CMP-YYYY-XXX dengan leading zero 3 digit", () => {
    expect(formatComplaintNumber(2026, 1)).toBe("CMP-2026-001");
    expect(formatComplaintNumber(2026, 9)).toBe("CMP-2026-009");
    expect(formatComplaintNumber(2026, 10)).toBe("CMP-2026-010");
    expect(formatComplaintNumber(2026, 99)).toBe("CMP-2026-099");
    expect(formatComplaintNumber(2026, 100)).toBe("CMP-2026-100");
    expect(formatComplaintNumber(2026, 1250)).toBe("CMP-2026-1250");
  });

  it("harus mengembalikan urutan 1 jika belum ada nomor keluhan sebelumnya", () => {
    expect(parseNextSequence(null, 2026)).toBe(1);
    expect(parseNextSequence(undefined, 2026)).toBe(1);
    expect(parseNextSequence("", 2026)).toBe(1);
  });

  it("harus menaikkan nomor urut berikutnya dari nomor keluhan terakhir", () => {
    expect(parseNextSequence("CMP-2026-001", 2026)).toBe(2);
    expect(parseNextSequence("CMP-2026-025", 2026)).toBe(26);
    expect(parseNextSequence("CMP-2026-099", 2026)).toBe(100);
  });

  it("harus mereset urutan ke 1 jika nomor keluhan terakhir berasal dari tahun yang berbeda", () => {
    // Nomor keluhan tahun lalu: CMP-2025-450, tahun target: 2026
    expect(parseNextSequence("CMP-2025-450", 2026)).toBe(1);
  });

  it("harus menangani format string yang rusak secara aman tanpa melempar error", () => {
    expect(parseNextSequence("INVALID-FORMAT", 2026)).toBe(1);
    expect(parseNextSequence("CMP-2026", 2026)).toBe(1);
    expect(parseNextSequence("CMP-2026-ABC", 2026)).toBe(1);
  });
});
