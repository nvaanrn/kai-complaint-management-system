/**
 * Modul Validasi Standar Sistem Pengelolaan Keluhan Pelanggan (SPKP) PT KAI
 * Mencegah data tidak valid, nilai string kosong/whitespace, dan input berbahaya.
 */

import { ComplaintCategory } from "@/types/database";

export interface ComplaintInput {
  customerName?: string | null;
  customerContact?: string | null;
  daopOrStation?: string | null;
  source?: string | null;
  category?: string | null;
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

export interface ReopenRequestInput {
  reason?: string | null;
}

export interface ReopenReviewInput {
  decision?: "APPROVED" | "REJECTED" | null;
  adminNotes?: string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  firstError?: string;
}

import {
  VALID_SOURCES,
  type ComplaintSource,
  normalizeComplaintSource,
  SOURCE_METADATA,
  LEGACY_SOURCE_MAPPING,
} from "./sources";

export {
  VALID_SOURCES,
  type ComplaintSource,
  normalizeComplaintSource,
  SOURCE_METADATA,
  LEGACY_SOURCE_MAPPING,
};

export const VALID_CATEGORIES = Object.values(ComplaintCategory);

/**
 * Validasi form registrasi / edit keluhan pelanggan
 */
export function validateComplaintInput(input: ComplaintInput): ValidationResult {
  const errors: Record<string, string> = {};

  const customerName = input.customerName?.trim();
  if (!customerName) {
    errors.customerName = "Nama pelapor wajib diisi.";
  } else if (customerName.length < 3) {
    errors.customerName = "Nama pelapor minimal 3 karakter.";
  }

  const description = input.description?.trim();
  if (!description) {
    errors.description = "Uraian lengkap keluhan wajib diisi sebelum data dapat disimpan.";
  } else if (description.length < 10) {
    errors.description = "Uraian keluhan minimal 10 karakter agar informatif bagi petugas.";
  }

  const source = input.source?.trim();
  if (!source) {
    errors.source = "Sumber saluran keluhan wajib dipilih.";
  } else if (!VALID_SOURCES.includes(source as any)) {
    errors.source = "Sumber saluran keluhan tidak valid.";
  }

  if (input.category && !VALID_CATEGORIES.includes(input.category as any)) {
    errors.category = "Kategori jenis keluhan tidak valid.";
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
  const notes = input.notes?.trim();
  const proofImageUrl = input.proofImageUrl?.trim();

  // Validasi dasar saat simpan draf: minimal salah satu field terisi
  if (!input.submitForVerification) {
    if (!corrective && !preventive && !notes && !proofImageUrl) {
      errors.general = "Formulir tindakan penanganan tidak boleh kosong. Harap isi tindakan perbaikan.";
    }
  }

  // Jika diajukan ke Verifikator (submitForVerification = true), seluruh bukti wajib lengkap
  if (input.submitForVerification) {
    if (!corrective) {
      errors.correctiveAction = "Tindakan perbaikan (Corrective Action) wajib diisi sebelum diajukan untuk verifikasi.";
    } else if (corrective.length < 10) {
      errors.correctiveAction = "Tindakan perbaikan minimal 10 karakter.";
    }

    if (!preventive) {
      errors.preventiveAction = "Tindakan pencegahan (Preventive Action) wajib diisi sebelum diajukan untuk verifikasi.";
    } else if (preventive.length < 10) {
      errors.preventiveAction = "Tindakan pencegahan minimal 10 karakter.";
    }

    if (!proofImageUrl) {
      errors.proofImageUrl = "Foto bukti pelaksanaan perbaikan di lapangan wajib diunggah.";
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

  if (!input.result || !["APPROVED", "REJECTED"].includes(input.result)) {
    errors.result = "Keputusan verifikasi (APPROVED atau REJECTED) wajib dipilih.";
  }

  const feedback = input.feedback?.trim();
  if (input.result === "REJECTED") {
    if (!feedback) {
      errors.feedback = "Catatan revisi wajib dicantumkan jika hasil verifikasi ditolak.";
    } else if (feedback.length < 10) {
      errors.feedback = "Catatan revisi minimal 10 karakter agar menjadi instruksi perbaikan yang jelas bagi PIC.";
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
 * Validasi permohonan pembukaan kembali (Reopen Request)
 */
export function validateReopenRequestInput(input: ReopenRequestInput): ValidationResult {
  const errors: Record<string, string> = {};
  const reason = input.reason?.trim();

  if (!reason) {
    errors.reason = "Alasan permohonan pembukaan kembali keluhan wajib diisi.";
  } else if (reason.length < 10) {
    errors.reason = "Alasan pembukaan kembali minimal 10 karakter agar jelas bagi Admin peninjau.";
  }

  const isValid = Object.keys(errors).length === 0;
  return {
    isValid,
    errors,
    firstError: isValid ? undefined : Object.values(errors)[0],
  };
}

/**
 * Validasi peninjauan keputusan permohonan buka kembali oleh Admin
 */
export function validateReopenReviewInput(input: ReopenReviewInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.decision || !["APPROVED", "REJECTED"].includes(input.decision)) {
    errors.decision = "Keputusan peninjauan (APPROVED atau REJECTED) wajib ditentukan.";
  }

  const adminNotes = input.adminNotes?.trim();
  if (!adminNotes) {
    errors.adminNotes = "Catatan pertimbangan Admin wajib diisi.";
  } else if (adminNotes.length < 5) {
    errors.adminNotes = "Catatan pertimbangan minimal 5 karakter.";
  }

  const isValid = Object.keys(errors).length === 0;
  return {
    isValid,
    errors,
    firstError: isValid ? undefined : Object.values(errors)[0],
  };
}
