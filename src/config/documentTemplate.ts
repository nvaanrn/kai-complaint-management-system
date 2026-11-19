/**
 * Konfigurasi Statis Formulir Mutu KAI
 * Sesuai standar ISO/SOP KAI FR.SM/TI/033.001
 * Nomor dokumen dan versi bersifat paten dan tidak boleh diubah per penerbitan.
 */

export const DOCUMENT_HEADER = {
  DOCUMENT_NUMBER: "FR.SM/TI/033.001/10-2020",
  VERSION: "002-2020",
  VERSION_TEXT: "Edisi: 002-2020",
  COMPANY_NAME: "PT KERETA API INDONESIA (PERSERO)",
  SUBTITLE: "Sistem Penanganan Keluhan Pelanggan (SPKP) • Pengendalian Mutu Layanan",
  FORM_TITLE: "Daftar Rekapitulasi Tindak Lanjut Keluhan Pelanggan",
  FORM_SUBTITLE: "Dokumen resmi penanganan dan verifikasi mutu keluhan pelanggan kereta api",
  FOOTER_TEXT: "Formulir Pengendalian Mutu FR.SM/TI/033.001 • PT Kereta Api Indonesia (Persero)",
} as const;

export const KAI_DOCUMENT_NUMBER = DOCUMENT_HEADER.DOCUMENT_NUMBER;
export const KAI_DOCUMENT_VERSION = DOCUMENT_HEADER.VERSION;
export const KAI_DOCUMENT_VERSION_TEXT = DOCUMENT_HEADER.VERSION_TEXT;

