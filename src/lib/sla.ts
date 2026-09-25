/**
 * Modul Perhitungan SLA (Service Level Agreement) Standar Pelayanan KAI
 * Standar target penyelesaian respon keluhan: 24 Jam
 */

export interface SlaCalculationOptions {
  date: string | Date;
  status: string;
  submittedAt?: string | Date | null;
  createdAt?: string | Date | null;
  targetHours?: number;
  now?: number; // mempermudah deterministik unit test
}

export interface SlaResult {
  elapsedHours: number;
  isOverdue: boolean;
  isMet: boolean;
  statusText: string;
  badgeVariant: "success" | "warning" | "danger" | "neutral";
  remainingHours: number;
}

/**
 * Menghitung audit waktu SLA respon keluhan berdasarkan SOP KAI (Target default 24 Jam)
 */
export function calculateSla(options: SlaCalculationOptions): SlaResult {
  const targetHours = options.targetHours ?? 24;
  const startTime = new Date(options.date).getTime();
  const currentTime = options.now ?? Date.now();

  const isCompleted = options.status === "SELESAI" || options.status === "TERVERIFIKASI";
  const isSubmitted = Boolean(options.submittedAt);

  let endTime: number;
  if (options.submittedAt) {
    endTime = new Date(options.submittedAt).getTime();
  } else if (isCompleted) {
    endTime = options.createdAt ? new Date(options.createdAt).getTime() : currentTime;
  } else {
    endTime = currentTime;
  }

  const elapsedHours = Math.max(0, (endTime - startTime) / (1000 * 60 * 60));
  const remainingHours = Math.max(0, Math.round(targetHours - elapsedHours));

  if (isCompleted || isSubmitted) {
    if (elapsedHours <= targetHours) {
      return {
        elapsedHours,
        isOverdue: false,
        isMet: true,
        statusText: `Terpenuhi (${Math.round(elapsedHours)} Jam)`,
        badgeVariant: "success",
        remainingHours: 0,
      };
    } else {
      const overHours = Math.round(elapsedHours - targetHours);
      return {
        elapsedHours,
        isOverdue: true,
        isMet: false,
        statusText: `Melewati Batas (+${overHours} Jam)`,
        badgeVariant: "warning",
        remainingHours: 0,
      };
    }
  } else {
    if (elapsedHours > targetHours) {
      const overHours = Math.round(elapsedHours - targetHours);
      return {
        elapsedHours,
        isOverdue: true,
        isMet: false,
        statusText: `Terlambat / Overdue (+${overHours} Jam)`,
        badgeVariant: "danger",
        remainingHours: 0,
      };
    } else {
      return {
        elapsedHours,
        isOverdue: false,
        isMet: true,
        statusText: `Aktif (Sisa ${remainingHours} Jam)`,
        badgeVariant: "neutral",
        remainingHours,
      };
    }
  }
}
