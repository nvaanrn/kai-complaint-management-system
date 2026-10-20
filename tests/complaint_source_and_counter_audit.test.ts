import { describe, it, expect, vi } from "vitest";
import {
  VALID_SOURCES,
  normalizeComplaintSource,
  SOURCE_METADATA,
  LEGACY_SOURCE_MAPPING,
} from "@/lib/sources";
import { formatComplaintNumber, parseNextSequence, extractComplaintSequence } from "@/lib/complaintNumber";
import {
  getHighestComplaintSequenceForYear,
  generateComplaintNumber,
} from "@/app/actions/complaints";

describe("Audit & Fix Tests: Data Sumber Resmi (Single Source of Truth)", () => {
  it("harus menyediakan 6 saluran resmi KAI sesuai standar bisnis", () => {
    expect(VALID_SOURCES).toEqual([
      "Aplikasi Access by KAI",
      "Contact Center 121",
      "Media Sosial (Twitter/X, IG)",
      "Petugas Stasiun / Loket",
      "Email Resmi KAI",
      "Lainnya",
    ]);
  });

  it("harus memiliki metadata lengkap (icon, color, label) untuk setiap saluran resmi", () => {
    for (const source of VALID_SOURCES) {
      const meta = SOURCE_METADATA[source];
      expect(meta).toBeDefined();
      expect(meta.icon).toBeTruthy();
      expect(meta.color).toBeTruthy();
      expect(meta.bgColor).toBeTruthy();
      expect(meta.textColor).toBeTruthy();
    }
  });

  it("harus menormalisasi saluran resmi secara tepat (case-insensitive & trim)", () => {
    expect(normalizeComplaintSource("Aplikasi Access by KAI")).toBe("Aplikasi Access by KAI");
    expect(normalizeComplaintSource("  contact center 121  ")).toBe("Contact Center 121");
    expect(normalizeComplaintSource("Media Sosial (Twitter/X, IG)")).toBe("Media Sosial (Twitter/X, IG)");
    expect(normalizeComplaintSource("Petugas Stasiun / Loket")).toBe("Petugas Stasiun / Loket");
    expect(normalizeComplaintSource("Email Resmi KAI")).toBe("Email Resmi KAI");
    expect(normalizeComplaintSource("Lainnya")).toBe("Lainnya");
  });

  it("harus menormalisasi saluran lama (legacy) ke saluran resmi KAI", () => {
    expect(normalizeComplaintSource("Telepon")).toBe("Contact Center 121");
    expect(normalizeComplaintSource("telepon")).toBe("Contact Center 121");
    expect(normalizeComplaintSource("Email")).toBe("Email Resmi KAI");
    expect(normalizeComplaintSource("Laporan Langsung")).toBe("Petugas Stasiun / Loket");
    expect(normalizeComplaintSource("Nota Dinas")).toBe("Lainnya");
    expect(normalizeComplaintSource("Helpdesk Internal")).toBe("Lainnya");
    expect(normalizeComplaintSource("Survey Pelanggan")).toBe("Lainnya");
  });

  it("harus memberikan fallback 'Lainnya' jika nilai sumber null, undefined, atau tidak dikenal", () => {
    expect(normalizeComplaintSource(null)).toBe("Lainnya");
    expect(normalizeComplaintSource(undefined)).toBe("Lainnya");
    expect(normalizeComplaintSource("")).toBe("Lainnya");
    expect(normalizeComplaintSource("Saluran Tidak Diketahui")).toBe("Lainnya");
  });
});

describe("Audit & Fix Tests: Generator Nomor Keluhan & Self-Healing Counter", () => {
  it("extractComplaintSequence: harus mengekstrak nomor urut dari format CMP-YYYY-XXX", () => {
    expect(extractComplaintSequence("CMP-2026-001", 2026)).toBe(1);
    expect(extractComplaintSequence("CMP-2026-003", 2026)).toBe(3);
    expect(extractComplaintSequence("CMP-2026-045", 2026)).toBe(45);
    expect(extractComplaintSequence("CMP-2025-010", 2026)).toBeNull(); // Tahun beda
    expect(extractComplaintSequence("INVALID", 2026)).toBeNull();
  });

  it("getHighestComplaintSequenceForYear: harus mencari nomor sequence tertinggi di database", async () => {
    const mockTx = {
      complaint: {
        findMany: vi.fn().mockResolvedValue([
          { complaintNumber: "CMP-2026-001" },
          { complaintNumber: "CMP-2026-003" },
          { complaintNumber: "CMP-2026-002" },
        ]),
      },
    };

    const maxSeq = await getHighestComplaintSequenceForYear(mockTx, 2026);
    expect(maxSeq).toBe(3);
  });

  it("generateComplaintNumber: melakukan self-healing saat ComplaintCounter belum ada di database", async () => {
    // Skenario: Complaint memiliki CMP-2026-001, 002, 003, tetapi ComplaintCounter masih kosong (null)
    const mockTx = {
      complaint: {
        findMany: vi.fn().mockResolvedValue([
          { complaintNumber: "CMP-2026-001" },
          { complaintNumber: "CMP-2026-002" },
          { complaintNumber: "CMP-2026-003" },
        ]),
      },
      complaintCounter: {
        findUnique: vi.fn().mockResolvedValue(null), // Counter belum ada
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
    };

    const newNumber = await generateComplaintNumber(mockTx, 2026);

    // Harus menghasilkan CMP-2026-004 (bukan CMP-2026-001)
    expect(newNumber).toBe("CMP-2026-004");
    expect(mockTx.complaintCounter.create).toHaveBeenCalledWith({
      data: {
        year: 2026,
        lastSequence: 4,
      },
    });
  });

  it("generateComplaintNumber: melakukan self-healing saat ComplaintCounter tertinggal dari data Complaint", async () => {
    // Skenario: Counter mencatat sequence 1, padahal di Complaint sudah ada CMP-2026-005
    const mockTx = {
      complaint: {
        findMany: vi.fn().mockResolvedValue([
          { complaintNumber: "CMP-2026-005" },
        ]),
      },
      complaintCounter: {
        findUnique: vi.fn().mockResolvedValue({ year: 2026, lastSequence: 1 }), // Tertinggal!
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ year: 2026, ...data })),
      },
    };

    const newNumber = await generateComplaintNumber(mockTx, 2026);

    // Harus melompat ke 6 (5 + 1)
    expect(newNumber).toBe("CMP-2026-006");
    expect(mockTx.complaintCounter.update).toHaveBeenCalledWith({
      where: { year: 2026 },
      data: {
        lastSequence: 6,
      },
    });
  });

  it("generateComplaintNumber: increment atomik normal jika counter sudah sinkron", async () => {
    // Skenario: Counter berada di urutan 3, data complaint terbesar juga 3
    const mockTx = {
      complaint: {
        findMany: vi.fn().mockResolvedValue([
          { complaintNumber: "CMP-2026-003" },
        ]),
      },
      complaintCounter: {
        findUnique: vi.fn().mockResolvedValue({ year: 2026, lastSequence: 3 }),
        update: vi.fn().mockResolvedValue({ year: 2026, lastSequence: 4 }),
      },
    };

    const newNumber = await generateComplaintNumber(mockTx, 2026);

    expect(newNumber).toBe("CMP-2026-004");
    expect(mockTx.complaintCounter.update).toHaveBeenCalledWith({
      where: { year: 2026 },
      data: {
        lastSequence: { increment: 1 },
      },
    });
  });
});
