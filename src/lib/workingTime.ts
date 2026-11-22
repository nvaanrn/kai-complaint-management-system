import { WORKING_HOURS_CONFIG } from "@/config/workingHours";

/**
 * Perhitungan waktu kerja untuk SLA. Semua fungsi murni (tanpa database):
 * daftar hari libur diberikan pemanggil sebagai kunci tanggal "YYYY-MM-DD" (WIB).
 */

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MAX_SCAN_DAYS = 3650; // pengaman: sepuluh tahun

type Holidays = ReadonlySet<string> | readonly string[];

const OFFSET_MS = WORKING_HOURS_CONFIG.utcOffsetHours * MS_PER_HOUR;
const SEGMENTS_MS = WORKING_HOURS_CONFIG.segments.map((s) => ({
  start: s.start * MS_PER_MINUTE,
  end: s.end * MS_PER_MINUTE,
}));

function toSet(holidays: Holidays | undefined): ReadonlySet<string> {
  if (!holidays) return new Set<string>();
  return holidays instanceof Set ? holidays : new Set(holidays as readonly string[]);
}

// Waktu "dinding" WIB dinyatakan sebagai milidetik sejak epoch (digeser sebesar offset).
function toLocalMs(date: Date): number {
  return date.getTime() + OFFSET_MS;
}

function fromLocalMs(localMs: number): Date {
  return new Date(localMs - OFFSET_MS);
}

function dayKeyFromIndex(dayIndex: number): string {
  return new Date(dayIndex * MS_PER_DAY).toISOString().slice(0, 10);
}

function weekdayFromIndex(dayIndex: number): number {
  // 1 Januari 1970 adalah hari Kamis (4); 0 = Minggu
  return (((dayIndex + 4) % 7) + 7) % 7;
}

function isWorkingDayIndex(dayIndex: number, holidays: ReadonlySet<string>): boolean {
  if (!WORKING_HOURS_CONFIG.workDays.includes(weekdayFromIndex(dayIndex))) return false;
  return !holidays.has(dayKeyFromIndex(dayIndex));
}

/** Kunci tanggal "YYYY-MM-DD" menurut WIB untuk suatu waktu. */
export function toDayKey(date: Date): string {
  return dayKeyFromIndex(Math.floor(toLocalMs(date) / MS_PER_DAY));
}

/** Jumlah jam kerja dalam satu hari kerja penuh (8 jam pada konfigurasi awal). */
export function workingHoursPerDay(): number {
  return SEGMENTS_MS.reduce((sum, s) => sum + (s.end - s.start), 0) / MS_PER_HOUR;
}

/**
 * Menambahkan sejumlah jam kerja ke waktu awal.
 * - Jika waktu awal di luar jam kerja (malam, akhir pekan, libur, istirahat), hitungan dimulai
 *   pada awal jam kerja berikutnya.
 * - Jika sisa jam habis tepat di akhir jam kerja, tenggat jatuh pada akhir jam kerja itu.
 */
export function addWorkingHours(start: Date, hours: number, holidays?: Holidays): Date {
  if (!Number.isFinite(hours) || hours < 0) {
    throw new Error("Jumlah jam kerja harus berupa bilangan tidak negatif.");
  }
  let remaining = Math.round(hours * MS_PER_HOUR);
  if (remaining === 0) return new Date(start.getTime());

  const holidaySet = toSet(holidays);
  const local = toLocalMs(start);
  let dayIndex = Math.floor(local / MS_PER_DAY);
  let cursor = local - dayIndex * MS_PER_DAY;

  for (let i = 0; i < MAX_SCAN_DAYS; i++, dayIndex++, cursor = 0) {
    if (!isWorkingDayIndex(dayIndex, holidaySet)) continue;
    for (const seg of SEGMENTS_MS) {
      const from = Math.max(seg.start, cursor);
      if (from >= seg.end) continue;
      const available = seg.end - from;
      if (remaining <= available) {
        return fromLocalMs(dayIndex * MS_PER_DAY + from + remaining);
      }
      remaining -= available;
    }
  }
  throw new Error("Tidak dapat menghitung tenggat SLA: hari kerja tidak ditemukan dalam sepuluh tahun.");
}

/** Jumlah milidetik jam kerja yang terlewati di antara dua waktu (0 jika akhir <= awal). */
export function workingMsBetween(from: Date, to: Date, holidays?: Holidays): number {
  const a = toLocalMs(from);
  const b = toLocalMs(to);
  if (b <= a) return 0;

  const holidaySet = toSet(holidays);
  const firstDay = Math.floor(a / MS_PER_DAY);
  const lastDay = Math.floor(b / MS_PER_DAY);
  if (lastDay - firstDay > MAX_SCAN_DAYS) {
    throw new Error("Rentang waktu terlalu panjang untuk dihitung.");
  }

  let total = 0;
  for (let day = firstDay; day <= lastDay; day++) {
    if (!isWorkingDayIndex(day, holidaySet)) continue;
    const dayStart = day * MS_PER_DAY;
    for (const seg of SEGMENTS_MS) {
      const overlapStart = Math.max(a, dayStart + seg.start);
      const overlapEnd = Math.min(b, dayStart + seg.end);
      if (overlapEnd > overlapStart) total += overlapEnd - overlapStart;
    }
  }
  return total;
}

/** Jumlah jam kerja di antara dua waktu. */
export function workingHoursBetween(from: Date, to: Date, holidays?: Holidays): number {
  return workingMsBetween(from, to, holidays) / MS_PER_HOUR;
}
