import { describe, it, expect } from "vitest";
import {
  validateComplaintInput,
  validatePicExecutionInput,
  validateVerificationInput,
} from "@/lib/validation";

describe("Unit Test: Form Validation (validateComplaintInput)", () => {
  it("harus menolak input jika nama pelapor kosong atau hanya whitespace", () => {
    const res1 = validateComplaintInput({
      customerName: "",
      description: "AC di gerbong 3 mati",
      source: "Contact Center 121",
    });
    expect(res1.isValid).toBe(false);
    expect(res1.errors.customerName).toBeDefined();

    const res2 = validateComplaintInput({
      customerName: "   ",
      description: "AC di gerbong 3 mati",
      source: "Contact Center 121",
    });
    expect(res2.isValid).toBe(false);
    expect(res2.errors.customerName).toBeDefined();
  });

  it("harus menolak input jika uraian keluhan (description) kosong atau hanya spasi", () => {
    const res1 = validateComplaintInput({
      customerName: "Budi Santoso",
      description: "",
      source: "Contact Center 121",
    });
    expect(res1.isValid).toBe(false);
    expect(res1.errors.description).toBe("Uraian lengkap keluhan wajib diisi sebelum data dapat disimpan.");

    const res2 = validateComplaintInput({
      customerName: "Budi Santoso",
      description: "   \n\t  ",
      source: "Contact Center 121",
    });
    expect(res2.isValid).toBe(false);
    expect(res2.errors.description).toBe("Uraian lengkap keluhan wajib diisi sebelum data dapat disimpan.");
  });

  it("harus menolak jika sumber saluran keluhan tidak dipilih", () => {
    const res = validateComplaintInput({
      customerName: "Budi Santoso",
      description: "Toilet kereta airnya habis",
      source: "",
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.source).toBeDefined();
  });

  it("harus meloloskan form jika data pokok lengkap terisi", () => {
    const res = validateComplaintInput({
      customerName: "Ahmad Dahlan",
      customerContact: "081234567890",
      daopOrStation: "Daop 1 Jakarta / Gambir",
      description: "Keterlambatan KA Argo Parahyangan dan informasi tidak jelas di peron 3",
      source: "Aplikasi Access by KAI",
    });
    expect(res.isValid).toBe(true);
    expect(res.errors).toEqual({});
    expect(res.firstError).toBeUndefined();
  });
});

describe("Unit Test: PIC Execution Validation (validatePicExecutionInput)", () => {
  it("harus menolak jika form penanganan PIC kosong sama sekali", () => {
    const res = validatePicExecutionInput({
      correctiveAction: "",
      preventiveAction: "  ",
      submitForVerification: false,
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.general).toBeDefined();
  });

  it("harus mengizinkan simpan draft penanganan jika minimal salah satu tindakan terisi", () => {
    const res = validatePicExecutionInput({
      correctiveAction: "Pengecekan teknisi genset AC gerbong 3 sedang berlangsung",
      preventiveAction: "",
      submitForVerification: false,
    });
    expect(res.isValid).toBe(true);
  });

  it("harus menolak pengajuan verifikasi jika tindakan perbaikan belum diisi", () => {
    const res = validatePicExecutionInput({
      correctiveAction: "",
      preventiveAction: "Melakukan briefing SOP pemeriksaan berkala",
      submitForVerification: true,
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.correctiveAction).toBeDefined();
  });

  it("harus menolak pengajuan verifikasi jika tindakan pencegahan belum diisi", () => {
    const res = validatePicExecutionInput({
      correctiveAction: "Mengganti kompresor AC gerbong yang rusak",
      preventiveAction: "",
      submitForVerification: true,
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.preventiveAction).toBeDefined();
  });

  it("harus meloloskan pengajuan verifikasi jika tindakan perbaikan dan pencegahan lengkap", () => {
    const res = validatePicExecutionInput({
      correctiveAction: "Kipas angin dan exhaust fan di ruang tunggu stasiun telah diperbaiki",
      preventiveAction: "Menjadwalkan inspeksi fasilitas peron stasiun setiap 2 hari sekali",
      proofImageUrl: "https://example.com/supabase/storage/v1/object/public/proofs/bukti-1.jpg",
      submitForVerification: true,
    });
    expect(res.isValid).toBe(true);
    expect(res.errors).toEqual({});
  });
});

describe("Unit Test: Verifikasi Hasil (validateVerificationInput)", () => {
  it("harus menolak jika keputusan verifikasi tidak valid", () => {
    const res = validateVerificationInput({
      result: "INVALID_RESULT",
      feedback: "Sudah ok",
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.result).toBeDefined();
  });

  it("harus meloloskan persetujuan verifikasi (APPROVED) meskipun feedback opsional", () => {
    const res = validateVerificationInput({
      result: "APPROVED",
    });
    expect(res.isValid).toBe(true);
  });

  it("harus menolak penolakan verifikasi (REJECTED) jika tidak ada catatan perbaikan (feedback)", () => {
    const res = validateVerificationInput({
      result: "REJECTED",
      feedback: "   ",
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.feedback).toBe("Catatan revisi wajib dicantumkan jika hasil verifikasi ditolak.");
  });

  it("harus meloloskan penolakan verifikasi (REJECTED) jika disertai catatan revisi yang jelas", () => {
    const res = validateVerificationInput({
      result: "REJECTED",
      feedback: "Foto bukti belum jelas menunjukkan kondisi perbaikan AC di gerbong 3.",
    });
    expect(res.isValid).toBe(true);
    expect(res.errors).toEqual({});
  });
});
