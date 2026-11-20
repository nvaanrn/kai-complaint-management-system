import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { exportComplaintsToExcel } from "@/lib/exportExcel";
import { DOCUMENT_HEADER } from "@/config/documentTemplate";

describe("R7: kop dokumen paten", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Excel selalu memuat nomor dan versi dari DOCUMENT_HEADER, apa pun tanggal penerbitannya", async () => {
    for (const iso of ["2020-10-12T03:00:00Z", "2026-11-19T03:00:00Z", "2031-02-01T03:00:00Z"]) {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(iso));
      const result = await exportComplaintsToExcel([]);
      const ws = result.workbook.getWorksheet("FR.SM.TI.033.001")!;
      expect(ws.getCell("H1").value?.toString()).toBe(`: ${DOCUMENT_HEADER.DOCUMENT_NUMBER}`);
      expect(ws.getCell("H3").value?.toString()).toBe(`: ${DOCUMENT_HEADER.VERSION}`);
      vi.useRealTimers();
    }
  });

  it("Komponen kop tidak menerima prop nomor/versi dan membaca DOCUMENT_HEADER", () => {
    for (const file of ["src/components/pdf/KaiDocumentPdf.tsx", "src/components/KaiDocumentView.tsx"]) {
      const src = readFileSync(join(process.cwd(), file), "utf-8");
      expect(src).toContain("DOCUMENT_HEADER");
      expect(src).not.toMatch(/documentNumber\??\s*[:=]/);
      expect(src).not.toMatch(/version\??\s*[:=]/);
    }
  });
});