/**
 * Konfigurasi autentikasi SPKP (login dengan NIPP).
 * Format NIPP: hanya angka. Panjang pastinya belum dikonfirmasi KAI,
 * ubah NIPP_MIN_LENGTH dan NIPP_MAX_LENGTH di sini jika sudah diketahui.
 */
export const NIPP_MIN_LENGTH = 8;
export const NIPP_MAX_LENGTH = 18;

export const NIPP_REGEX = new RegExp(`^\\d{${NIPP_MIN_LENGTH},${NIPP_MAX_LENGTH}}$`);

export function isValidNipp(value: string): boolean {
  return NIPP_REGEX.test(value);
}

// Kunci akun sementara setelah gagal login berulang.
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MINUTES = 15;
