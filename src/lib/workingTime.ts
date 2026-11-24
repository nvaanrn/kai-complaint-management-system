import { WORKING_CALENDAR } from "@/config/workingCalendar";

/**
 * Perhitungan hari kerja untuk SLA. Semua fungsi murni (tanpa database):
 * daftar hari libur diberikan pemanggil sebagai kunci tanggal "YYYY-MM-DD" (WIB).
 *
 * Aturan: satu hari kerja = 24 jam. Tenggat jatuh pada JAM YANG SAMA, beberapa hari kerja
 * kemudian. Sabtu, Minggu, dan hari libur dilewati (tidak dihitung sebagai hari).
 * Jika keluhan dicatat pada hari non-kerja, hari kerja pertama sesudahnya dihitung sebagai hari ke-1.
 */

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MAX_SCAN_DAYS = 3650; // pengaman: sepuluh tahun

type Holidays = ReadonlySet<string> | readonly string[];

const OFFSET_MS = WORKING_CALENDAR.utcOffsetHours * MS_PER_HOUR;

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
  if (!WORKING_CALENDAR.workDays.includes(weekdayFromIndex(dayIndex))) return false;
  return !holidays.has(dayKeyFromIndex(dayIndex));
}

/** Kunci tanggal "YYYY-MM-DD" menurut WIB untuk suatu waktu. */
export function toDayKey(date: Date): string {
  return dayKeyFromIndex(Math.floor(toLocalMs(date) / MS_PER_DAY));
}

/** Apakah tanggal (menurut WIB) adalah hari kerja: bukan akhir pekan dan bukan hari libur. */
export function isWorkingDay(date: Date, holidays?: Holidays): boolean {
  return isWorkingDayIndex(Math.floor(toLocalMs(date) / MS_PER_DAY), toSet(holidays));
}

/**
 * Menambahkan sejumlah HARI KERJA ke waktu awal. Jam dan menit tetap sama.
 * Contoh: Senin 14:05 + 1 hari kerja = Selasa 14:05; Jumat 14:05 + 1 = Senin 14:05.
 */
export function addWorkingDays(start: Date, days: number, holidays?: Holidays): Date {
  if (!Number.isInteger(days) || days < 0) {
    throw new Error("Jumlah hari kerja harus berupa bilangan bulat tidak negatif.");
  }
  if (days === 0) return new Date(start.getTime());

  const holidaySet = toSet(holidays);
  const local = toLocalMs(start);
  let dayIndex = Math.floor(local / MS_PER_DAY);
  const timeOfDay = local - dayIndex * MS_PER_DAY;

  let remaining = days;
  for (let i = 0; i < MAX_SCAN_DAYS && remaining > 0; i++) {
    dayIndex++;
    if (isWorkingDayIndex(dayIndex, holidaySet)) remaining--;
  }
  if (remaining > 0) {
    throw new Error("Tidak dapat menghitung tenggat SLA: hari kerja tidak ditemukan dalam sepuluh tahun.");
  }
  return fromLocalMs(dayIndex * MS_PER_DAY + timeOfDay);
}

/**
 * Jumlah hari kerja penuh yang terlewati dari waktu awal sampai waktu akhir
 * (kebalikan addWorkingDays: n terbesar sehingga addWorkingDays(from, n) <= to).
 * Hasil 0 jika akhir tidak setelah awal. Dipakai untuk lama keterlambatan.
 */
export function workingDaysBetween(from: Date, to: Date, holidays?: Holidays): number {
  const a = toLocalMs(from);
  const b = toLocalMs(to);
  if (b <= a) return 0;

  const holidaySet = toSet(holidays);
  const startDay = Math.floor(a / MS_PER_DAY);
  const endDay = Math.floor(b / MS_PER_DAY);
  if (endDay - startDay > MAX_SCAN_DAYS) {
    throw new Error("Rentang waktu terlalu panjang untuk dihitung.");
  }
  const timeOfDay = a - startDay * MS_PER_DAY;

  let count = 0;
  for (let day = startDay + 1; day <= endDay; day++) {
    if (!isWorkingDayIndex(day, holidaySet)) continue;
    if (day * MS_PER_DAY + timeOfDay <= b) count++;
    else break;
  }
  return count;
}
