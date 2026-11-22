/**
 * Konfigurasi jam kerja untuk perhitungan SLA (satuan SLA = jam kerja).
 *
 * CATATAN: nilai di bawah adalah ASUMSI AWAL dan harus dikonfirmasi ke mentor KAI.
 * Cukup ubah file ini bila jam kerja resmi berbeda; seluruh perhitungan SLA mengikuti.
 *
 * - Zona waktu: WIB (UTC+7, tidak ada waktu musim panas).
 * - Hari kerja: Senin sampai Jumat (0 = Minggu ... 6 = Sabtu).
 * - Jam kerja per hari dibagi menjadi segmen agar waktu istirahat tidak dihitung.
 *   Nilai start/end dalam menit sejak pukul 00:00 WIB.
 * - Hari libur nasional dan cuti bersama dikelola di tabel Holiday (bukan di file ini).
 */
export const WORKING_HOURS_CONFIG = {
  utcOffsetHours: 7,
  workDays: [1, 2, 3, 4, 5] as readonly number[],
  segments: [
    { start: 8 * 60, end: 12 * 60 }, // 08:00 - 12:00
    { start: 13 * 60, end: 17 * 60 }, // 13:00 - 17:00 (istirahat 12:00 - 13:00)
  ] as ReadonlyArray<{ start: number; end: number }>,
} as const;
