import { addWorkingDays } from "@/lib/workingTime";

/**
 * Perpanjangan SLA saat Verifikator menolak hasil penanganan PIC.
 * Waktu SLA berhenti saat ditolak; Verifikator menetapkan tambahan waktu perbaikan dalam HARI KERJA,
 * dan tenggat efektif yang baru dihitung dari saat penolakan.
 */

export const EXTENSION_DAYS_MIN = 1;
export const EXTENSION_DAYS_MAX = 30;

export function validateExtraWorkingDays(raw: unknown): { valid: boolean; value: number; error?: string } {
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    return {
      valid: false,
      value: 0,
      error: "Tambahan waktu perbaikan wajib diisi dengan bilangan bulat (hari kerja) saat menolak.",
    };
  }
  if (raw < EXTENSION_DAYS_MIN || raw > EXTENSION_DAYS_MAX) {
    return {
      valid: false,
      value: raw,
      error: `Tambahan waktu perbaikan harus antara ${EXTENSION_DAYS_MIN} dan ${EXTENSION_DAYS_MAX} hari kerja.`,
    };
  }
  return { valid: true, value: raw };
}

/** Tenggat efektif baru: saat penolakan ditambah sejumlah hari kerja (akhir pekan dan libur dilewati). */
export function computeExtensionDeadline(
  rejectedAt: Date,
  extraWorkingDays: number,
  holidays?: readonly string[]
): Date {
  return addWorkingDays(rejectedAt, extraWorkingDays, holidays);
}
