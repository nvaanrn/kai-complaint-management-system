/**
 * Modul Perhitungan SLA (Service Level Agreement) Standar Pelayanan KAI
 *
 * Aturan bisnis:
 * - Target SLA ditentukan per jenis keluhan (snapshot slaTargetHours pada tiket).
 * - Keluhan dianggap selesai ketika verifikator menyetujui (completedAt).
 * - Waktu PIC mengajukan hasil (submittedAt) bukan waktu penyelesaian final.
 * - Default target 24 jam jika tidak ada kebijakan kategori.
 */

export interface SlaCalculationOptions {
  /** Tanggal keluhan dibuat / diterima */
  date: string | Date;
  /** Status keluhan saat ini */
  status: string;
  /** Waktu PIC mengajukan verifikasi (bukan waktu selesai final) */
  submittedAt?: string | Date | null;
  /** Waktu verifikator menyetujui (waktu selesai resmi) */
  completedAt?: string | Date | null;
  /** Target jam SLA dari snapshot keluhan (per kategori) */
  targetHours?: number | null;
  /** Override waktu sekarang untuk keperluan unit test */
  now?: number;
}

export interface SlaResult {
  /** Jam yang telah berlalu */
  elapsedHours: number;
  /** Apakah sudah melewati batas waktu SLA */
  isOverdue: boolean;
  /** Apakah SLA terpenuhi (selesai dalam batas waktu) */
  isMet: boolean;
  /** Apakah mendekati batas waktu (sisa <= 6 jam, belum selesai) */
  isNearDeadline: boolean;
  /** Teks deskripsi status SLA */
  statusText: string;
  /** Variant badge UI */
  badgeVariant: "success" | "warning" | "danger" | "neutral";
  /** Sisa jam menuju batas waktu (0 jika sudah lewat atau selesai) */
  remainingHours: number;
  /** Target jam SLA yang digunakan dalam perhitungan */
  targetHoursUsed: number;
}

/** Ambang batas jam yang dianggap "mendekati deadline" */
const NEAR_DEADLINE_THRESHOLD_HOURS = 6;

/**
 * Menghitung status SLA keluhan.
 *
 * Logika end-time:
 * 1. Jika keluhan TERVERIFIKASI dan ada completedAt → gunakan completedAt (waktu verifikator approve)
 * 2. Jika PIC sudah submit (submittedAt) dan belum terverifikasi → gunakan submittedAt untuk durasi PIC
 * 3. Jika belum submit → gunakan waktu sekarang (SLA masih berjalan)
 */
export function calculateSla(options: SlaCalculationOptions): SlaResult {
  const targetHours = options.targetHours ?? 24;
  const startTime = new Date(options.date).getTime();
  const currentTime = options.now ?? Date.now();

  // Validasi tanggal
  if (isNaN(startTime)) {
    return {
      elapsedHours: 0,
      isOverdue: false,
      isMet: false,
      isNearDeadline: false,
      statusText: "Tanggal tidak valid",
      badgeVariant: "neutral",
      remainingHours: 0,
      targetHoursUsed: targetHours,
    };
  }

  // Determine complaint progress flags
  const isCompleted = Boolean(options.completedAt);
  const isSubmitted = Boolean(options.submittedAt);
  const isVerified = options.status === "TERVERIFIKASI";

  // Determine end time based on available timestamps
  let endTime: number;
  if (options.completedAt) {
    // Use the official completion time (verifier approved)
    endTime = new Date(options.completedAt).getTime();
  } else if (isSubmitted && options.submittedAt) {
    // Use the PIC submission time when waiting for verification
    endTime = new Date(options.submittedAt).getTime();
  } else {
    // Still active – use current time
    endTime = currentTime;
  }

  // Validasi endTime
  if (isNaN(endTime)) {
    endTime = currentTime;
  }

  const elapsedMs = Math.max(0, endTime - startTime);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const remainingHours = Math.max(0, Math.round(targetHours - elapsedHours));

  // Kasus 1: Keluhan terverifikasi (selesai)
  if (isCompleted || (isSubmitted && (isVerified || options.status === "MENUNGGU_VERIFIKASI" || options.status === "SELESAI"))) {
    if (elapsedHours <= targetHours) {
      return {
        elapsedHours,
        isOverdue: false,
        isMet: true,
        isNearDeadline: false,
        statusText: `Terpenuhi (${Math.round(elapsedHours)} Jam)`,
        badgeVariant: "success",
        remainingHours: 0,
        targetHoursUsed: targetHours,
      };
    } else {
      const overHours = Math.round(elapsedHours - targetHours);
      return {
        elapsedHours,
        isOverdue: true,
        isMet: false,
        isNearDeadline: false,
        statusText: `Melewati Batas (+${overHours} Jam)`,
        badgeVariant: "warning",
        remainingHours: 0,
        targetHoursUsed: targetHours,
      };
    }
  }

  // Kasus 2: Keluhan masih aktif (BELUM_DITANGANI / DALAM_PENANGANAN)
  if (elapsedHours > targetHours) {
    const overHours = Math.round(elapsedHours - targetHours);
    return {
      elapsedHours,
      isOverdue: true,
      isMet: false,
      isNearDeadline: false,
      statusText: `Terlambat / Overdue (+${overHours} Jam)`,
      badgeVariant: "danger",
      remainingHours: 0,
      targetHoursUsed: targetHours,
    };
  }

  const isNearDeadline = remainingHours <= NEAR_DEADLINE_THRESHOLD_HOURS;

  return {
    elapsedHours,
    isOverdue: false,
    isMet: true,
    isNearDeadline,
    statusText: isNearDeadline
      ? `Mendekati Batas (Sisa ${remainingHours} Jam)`
      : `Aktif (Sisa ${remainingHours} Jam)`,
    badgeVariant: isNearDeadline ? "warning" : "neutral",
    remainingHours,
    targetHoursUsed: targetHours,
  };
}
