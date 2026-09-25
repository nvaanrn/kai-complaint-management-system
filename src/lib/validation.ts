/**
 * Modul Validasi Standar Sistem Pengelolaan Keluhan Pelanggan (SPKP) PT KAI
 */

export interface ComplaintInput {
  customerName?: string | null;
  customerContact?: string | null;
  daopOrStation?: string | null;
  source?: string | null;
  description?: string | null;
  date?: string | Date | null;
  picId?: string | null;
}

export interface PicExecutionInput {
  correctiveAction?: string | null;
  preventiveAction?: string | null;
  notes?: string | null;
  proofImageUrl?: string | null;
  submitForVerification?: boolean;
}

export interface VerificationInput {
  result?: string | null;
  feedback?: string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  firstError?: string;
}

export const VALID_SOURCES = [
  "Aplikasi Access by KAI",
  "Contact Center 121",
  "Media Sosial (Twitter/X, IG)",
  "Petugas Stasiun / Loket",
  "Email Resmi KAI",
  "Lainnya",
] as const;

/**
 * Validasi form registrasi / edit keluhan pelanggan
 */
export function validateComplaintInput(input: ComplaintInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.customerName || !input.customerName.trim()) {
    errors.customerName = "Nama pelapor wajib diisi.";
  }

  if (!input.description || !input.description.trim()) {
    errors.description = "Uraian lengkap keluhan wajib diisi sebelum data dapat disimpan.";
  }

  if (!input.source || !input.source.trim()) {
    errors.source = "Sumber saluran keluhan wajib dipilih.";
  }

  const isValid = Object.keys(errors).length === 0;
  return {
    isValid,
    errors,
    firstError: isValid ? undefined : Object.values(errors)[0],
  };
}

/**
 * Validasi form eksekusi dan perbaikan oleh PIC
 */
export function validatePicExecutionInput(input: PicExecutionInput): ValidationResult {
  const errors: Record<string, string> = {};

  const corrective = input.correctiveAction?.trim();
  const preventive = input.preventiveAction?.trim();

  // Validasi dasar: tidak boleh kosong sama sekali jika disimpan
  if (!corrective && !preventive) {
    errors.general = "Formulir tindakan penanganan tidak boleh kosong. Harap isi tindakan perbaikan.";
  }

  // Jika diajukan ke Verifikator (submitForVerification = true), kedua field wajib lengkap
  if (input.submitForVerification) {
    if (!corrective) {
      errors.correctiveAction = "Tindakan perbaikan (Corrective Action) wajib diisi sebelum diajukan untuk verifikasi.";
    }
    if (!preventive) {
      errors.preventiveAction = "Tindakan pencegahan (Preventive Action) wajib diisi sebelum diajukan untuk verifikasi.";
    }
  }

  const isValid = Object.keys(errors).length === 0;
  return {
    isValid,
    errors,
    firstError: isValid ? undefined : Object.values(errors)[0],
  };
}

/**
 * Validasi form verifikasi oleh Verifikator
 */
export function validateVerificationInput(input: VerificationInput): ValidationResult {
  const errors: Record<string, string> = {};

  // Nilai valid sesuai enum VerificationResult di database: APPROVED / REJECTED
  if (!input.result || !["APPROVED", "REJECTED"].includes(input.result)) {
    errors.result = "Keputusan verifikasi (APPROVED atau REJECTED) wajib dipilih.";
  }

  if (input.result === "REJECTED" && (!input.feedback || !input.feedback.trim())) {
    errors.feedback = "Catatan revisi wajib dicantumkan jika hasil verifikasi ditolak.";
  }

  const isValid = Object.keys(errors).length === 0;
  return {
    isValid,
    errors,
    firstError: isValid ? undefined : Object.values(errors)[0],
  };
}
