/**
 * Modul Generator dan Parser Nomor Registrasi Keluhan (CMP-YYYY-XXX)
 */

export function formatComplaintNumber(year: number, sequence: number): string {
  const safeSequence = Math.max(1, Math.floor(sequence));
  return `CMP-${year}-${String(safeSequence).padStart(3, "0")}`;
}

export function parseNextSequence(lastComplaintNumber?: string | null, targetYear?: number): number {
  const currentYear = targetYear ?? new Date().getFullYear();
  const prefix = `CMP-${currentYear}-`;

  if (!lastComplaintNumber || typeof lastComplaintNumber !== "string") {
    return 1;
  }

  if (!lastComplaintNumber.startsWith(prefix)) {
    return 1;
  }

  const parts = lastComplaintNumber.split("-");
  if (parts.length < 3) {
    return 1;
  }

  const num = parseInt(parts[2], 10);
  if (isNaN(num) || num < 0) {
    return 1;
  }

  return num + 1;
}
