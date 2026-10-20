import React from "react";
import { ComplaintStatus, VerificationResult } from "@/types/database";

interface StatusBadgeProps {
  status: ComplaintStatus | string;
  verifications?: Array<{
    result: VerificationResult | string;
  }>;
  className?: string;
}

export default function StatusBadge({ status, verifications, className = "" }: StatusBadgeProps) {
  const lastVerif = verifications && verifications.length > 0 ? verifications[0] : null;
  const isRejectedBefore = lastVerif?.result === VerificationResult.REJECTED;

  switch (status) {
    case ComplaintStatus.BELUM_DITANGANI:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/90 ${className}`}
          title="Keluhan baru dicatat, belum ada tindakan perbaikan"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
          <span>Belum Ditangani</span>
        </span>
      );

    case ComplaintStatus.DALAM_PENANGANAN:
      return (
        <div className={`flex flex-col items-start gap-1 ${className}`}>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200/90"
            title="Sedang ditindaklanjuti oleh petugas PIC"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" aria-hidden="true" />
            <span>Dalam Penanganan</span>
          </span>
          {isRejectedBefore && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
              title="Perbaikan sebelumnya ditolak oleh verifikator dan membutuhkan revisi"
            >
              <span>⚠️</span>
              <span>Revisi PIC</span>
            </span>
          )}
        </div>
      );

    case ComplaintStatus.MENUNGGU_VERIFIKASI:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-900 border border-purple-200/90 ${className}`}
          title="Tindakan PIC telah diajukan, menunggu tinjauan verifikator"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" aria-hidden="true" />
          <span>Menunggu Verifikasi</span>
        </span>
      );

    case ComplaintStatus.TERVERIFIKASI:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/90 ${className}`}
          title="Telah diverifikasi dan disetujui resmi oleh verifikator"
        >
          <span className="text-emerald-600 font-bold" aria-hidden="true">✓</span>
          <span>Terverifikasi</span>
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 ${className}`}>
          {status}
        </span>
      );
  }
}
