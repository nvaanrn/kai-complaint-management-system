/**
 * Kalender kerja untuk perhitungan SLA (satuan SLA = HARI KERJA).
 *
 * CATATAN: nilai di bawah adalah ASUMSI AWAL dan harus dikonfirmasi ke mentor KAI.
 * - Zona waktu: WIB (UTC+7, tanpa waktu musim panas).
 * - Hari kerja: Senin sampai Jumat (0 = Minggu ... 6 = Sabtu).
 * - Hari libur nasional dan cuti bersama dikelola Admin di tabel Holiday (menu Setting).
 * - Satu hari kerja dihitung 24 jam: tenggat jatuh pada jam yang sama, beberapa hari kerja kemudian.
 */
export const WORKING_CALENDAR = {
  utcOffsetHours: 7,
  workDays: [1, 2, 3, 4, 5] as readonly number[],
} as const;
