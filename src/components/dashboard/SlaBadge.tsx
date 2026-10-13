import React from "react";
import { calculateSla } from "@/lib/sla";
import { ComplaintData } from "@/types/database";

interface SlaBadgeProps {
  complaint: ComplaintData;
  className?: string;
  showDetails?: boolean;
}

export default function SlaBadge({ complaint, className = "", showDetails = false }: SlaBadgeProps) {
  const sla = calculateSla({
    date: complaint.date,
    status: complaint.status,
    submittedAt: complaint.submittedAt,
    completedAt: complaint.completedAt,
    targetHours: complaint.slaTargetHours,
  });

  const roundedElapsed = Math.round(sla.elapsedHours);

  // Status Terverifikasi / Selesai
  if (complaint.status === "TERVERIFIKASI" || complaint.completedAt) {
    if (sla.isMet) {
      return (
        <span
          title={`Selesai dalam ${roundedElapsed} jam (Target SLA: ${sla.targetHoursUsed} jam)`}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 ${className}`}
        >
          <span className="text-emerald-600 font-bold" aria-hidden="true">✓</span>
          <span>SLA OK ({roundedElapsed}j)</span>
        </span>
      );
    } else {
      const over = Math.max(1, roundedElapsed - sla.targetHoursUsed);
      return (
        <span
          title={`Penyelesaian membutuhkan ${roundedElapsed} jam (Melewati batas target SLA ${sla.targetHoursUsed} jam)`}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 ${className}`}
        >
          <span aria-hidden="true">⚠️</span>
          <span>Lewat SLA (+{over}j)</span>
        </span>
      );
    }
  }

  // Status Menunggu Verifikasi (Diajukan oleh PIC)
  if (complaint.status === "MENUNGGU_VERIFIKASI" || complaint.submittedAt) {
    if (sla.isMet) {
      return (
        <span
          title={`PIC mengajukan dalam ${roundedElapsed} jam (Target SLA: ${sla.targetHoursUsed} jam)`}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-900 border border-purple-200 ${className}`}
        >
          <span aria-hidden="true">⏱️</span>
          <span>Review ({roundedElapsed}j)</span>
        </span>
      );
    } else {
      const over = Math.max(1, roundedElapsed - sla.targetHoursUsed);
      return (
        <span
          title={`Diajukan ke verifikator setelah ${roundedElapsed} jam (Melewati batas SLA ${sla.targetHoursUsed} jam)`}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-300 ${className}`}
        >
          <span aria-hidden="true">⚠️</span>
          <span>Review (+{over}j)</span>
        </span>
      );
    }
  }

  // Status Aktif: BELUM_DITANGANI atau DALAM_PENANGANAN
  if (sla.isOverdue) {
    const over = Math.max(1, roundedElapsed - sla.targetHoursUsed);
    return (
      <span
        title={`Telah melewati batas waktu penanganan ${sla.targetHoursUsed} jam (+${over} jam terlambat)`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300 animate-pulse ${className}`}
      >
        <span aria-hidden="true">🚨</span>
        <span>Overdue (+{over}j)</span>
      </span>
    );
  }

  if (sla.isNearDeadline) {
    return (
      <span
        title={`Mendekati batas waktu penanganan ${sla.targetHoursUsed} jam (Sisa ${sla.remainingHours} jam)`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 ${className}`}
      >
        <span aria-hidden="true">⏱️</span>
        <span>Sisa {sla.remainingHours}j</span>
      </span>
    );
  }

  return (
    <span
      title={`Target SLA: ${sla.targetHoursUsed} jam (Sisa ${sla.remainingHours} jam)`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
    >
      <span aria-hidden="true">⏳</span>
      <span>Sisa {sla.remainingHours}j</span>
    </span>
  );
}
