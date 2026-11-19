import { describe, it, expect } from "vitest";
import {
  DOCUMENT_HEADER,
  KAI_DOCUMENT_NUMBER,
  KAI_DOCUMENT_VERSION,
  KAI_DOCUMENT_VERSION_TEXT,
} from "@/config/documentTemplate";

describe("Unit Test: Konfigurasi Dokumen Template KAI (documentTemplate)", () => {
  it("harus memastikan nomor dokumen kop bernilai persis 'FR.SM/TI/033.001/10-2020'", () => {
    expect(DOCUMENT_HEADER.DOCUMENT_NUMBER).toBe("FR.SM/TI/033.001/10-2020");
    expect(KAI_DOCUMENT_NUMBER).toBe("FR.SM/TI/033.001/10-2020");
  });

  it("harus memastikan versi dokumen bernilai '002-2020' dan teks versi tercetak 'Edisi: 002-2020'", () => {
    expect(DOCUMENT_HEADER.VERSION).toBe("002-2020");
    expect(KAI_DOCUMENT_VERSION).toBe("002-2020");
    expect(DOCUMENT_HEADER.VERSION_TEXT).toBe("Edisi: 002-2020");
    expect(KAI_DOCUMENT_VERSION_TEXT).toBe("Edisi: 002-2020");
  });

  it("harus memuat atribut kop statis KAI yang valid", () => {
    expect(DOCUMENT_HEADER.COMPANY_NAME).toBe("PT KERETA API INDONESIA (PERSERO)");
    expect(DOCUMENT_HEADER.SUBTITLE).toContain("Sistem Penanganan Keluhan Pelanggan (SPKP)");
    expect(DOCUMENT_HEADER.FORM_TITLE).toBe("Daftar Rekapitulasi Tindak Lanjut Keluhan Pelanggan");
    expect(DOCUMENT_HEADER.FOOTER_TEXT).toContain("FR.SM/TI/033.001");
  });
});

