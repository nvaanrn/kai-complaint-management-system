/**
 * Aturan murni untuk data hari libur (libur nasional dan cuti bersama) yang dipakai
 * menghitung tenggat SLA jam kerja. Tanggal disimpan sebagai kunci "YYYY-MM-DD" (WIB).
 */

export interface HolidayItem {
  id: string;
  date: string; // "YYYY-MM-DD"
  name: string;
}

export interface HolidayInput {
  date?: string;
  name?: string;
}

export const HOLIDAY_NAME_MAX_LENGTH = 120;
export const HOLIDAY_MIN_YEAR = 2000;
export const HOLIDAY_MAX_YEAR = 2100;

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function validateHolidayDate(raw: unknown): { valid: boolean; value: string; error?: string } {
  if (typeof raw !== "string") {
    return { valid: false, value: "", error: "Tanggal libur wajib diisi." };
  }
  const value = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { valid: false, value, error: "Format tanggal harus YYYY-MM-DD." };
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { valid: false, value, error: "Tanggal tidak valid." };
  }
  const year = parsed.getUTCFullYear();
  if (year < HOLIDAY_MIN_YEAR || year > HOLIDAY_MAX_YEAR) {
    return { valid: false, value, error: `Tahun harus antara ${HOLIDAY_MIN_YEAR} dan ${HOLIDAY_MAX_YEAR}.` };
  }
  return { valid: true, value };
}

export function validateHolidayName(raw: unknown): { valid: boolean; value: string; error?: string } {
  if (typeof raw !== "string") {
    return { valid: false, value: "", error: "Nama hari libur wajib diisi." };
  }
  const value = raw.replace(/\s+/g, " ").trim();
  if (!value) {
    return { valid: false, value, error: "Nama hari libur wajib diisi." };
  }
  if (value.length > HOLIDAY_NAME_MAX_LENGTH) {
    return { valid: false, value, error: `Nama maksimal ${HOLIDAY_NAME_MAX_LENGTH} karakter.` };
  }
  return { valid: true, value };
}

/** Kunci tanggal "YYYY-MM-DD" menjadi Date pukul 00:00 UTC (cocok dengan kolom DATE di database). */
export function dateKeyToUtcDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function utcDateToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Contoh: "Selasa, 24 November 2026" (tanpa bergantung pada data bahasa di mesin). */
export function formatHolidayDate(key: string): string {
  const d = dateKeyToUtcDate(key);
  return `${DAY_NAMES[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Sabtu atau Minggu: sudah bukan hari kerja, jadi mendaftarkannya sebagai libur tidak berpengaruh. */
export function isWeekendKey(key: string): boolean {
  const day = dateKeyToUtcDate(key).getUTCDay();
  return day === 0 || day === 6;
}

export function toHolidayItem(row: { id: string; date: Date; name: string }): HolidayItem {
  return { id: row.id, date: utcDateToKey(row.date), name: row.name };
}
