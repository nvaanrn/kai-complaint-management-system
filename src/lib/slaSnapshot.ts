import { addWorkingDays } from "@/lib/workingTime";

/**
 * Menghitung snapshot SLA keluhan saat dicatat.
 *
 * SLA dihitung dalam HARI KERJA (satu hari = 24 jam, Sabtu/Minggu/hari libur tidak dihitung).
 * Kolom slaHours menyimpan target dalam jam, yaitu hari x 24 (24 = 1 hari kerja, 48 = 2 hari kerja).
 *
 * Mengembalikan:
 *  - slaHours: target SLA (jam, kelipatan 24) pada saat keluhan dicatat
 *  - slaStartAt: awal hitungan (saat keluhan dicatat)
 *  - slaDeadlineInitial: tenggat awal, tidak berubah selama keluhan ada
 *  - slaDeadline: tenggat efektif (berubah jika kategori diganti atau Verifikator memberi tambahan waktu)
 *
 * holidays: daftar kunci tanggal libur "YYYY-MM-DD" (WIB).
 */
export function computeSlaSnapshot(start: Date, slaHours: number = 24, holidays?: readonly string[]) {
  const slaDays = Math.max(1, Math.ceil(slaHours / 24));
  const slaStartAt = new Date(start);
  const slaDeadlineInitial = addWorkingDays(slaStartAt, slaDays, holidays);
  const slaDeadline = new Date(slaDeadlineInitial);
  return {
    slaHours,
    slaStartAt,
    slaDeadlineInitial,
    slaDeadline,
  };
}
