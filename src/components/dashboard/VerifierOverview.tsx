import React from "react";
import { ComplaintData, VerificationResult } from "@/types/database";
import { calculateSla } from "@/lib/sla";

interface VerifierOverviewProps {
  complaints: ComplaintData[];
  onSelectPendingVerification: () => void;
  onSelectApproved: () => void;
  onFilterUrgentReview: () => void;
  activeSpecialFilter?: "urgent_review" | null;
  statusFilter: string;
}

export default function VerifierOverview({
  complaints,
  onSelectPendingVerification,
  onSelectApproved,
  onFilterUrgentReview,
  activeSpecialFilter,
  statusFilter,
}: VerifierOverviewProps) {
  const pendingComplaints = complaints.filter((c) => c.status === "MENUNGGU_VERIFIKASI");
  const approvedComplaints = complaints.filter((c) => c.status === "TERVERIFIKASI");

  // Keluhan dalam antrean verifikasi yang mendekati / melewati SLA
  const urgentReview = pendingComplaints.filter((c) => {
    const sla = calculateSla({
      date: c.date,
      status: c.status,
      submittedAt: c.submittedAt,
      completedAt: c.completedAt,
      targetHours: c.slaTargetHours,
    });
    return sla.isOverdue || sla.isNearDeadline;
  });

  // Total riwayat verifikasi yang pernah ditolak di seluruh keluhan
  const totalRejectedVerifications = complaints.reduce((acc, c) => {
    const countRejected = (c.verifications || []).filter(
      (v) => v.result === VerificationResult.REJECTED
    ).length;
    return acc + countRejected;
  }, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Alert Urgensi Jika Ada Antrean Mendekati / Lewat Batas Waktu */}
      {urgentReview.length > 0 && (
        <div
          onClick={onFilterUrgentReview}
          className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-sm cursor-pointer hover:bg-amber-100/60 transition flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">⏱️</span>
            <div>
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Ada {urgentReview.length} Keluhan Menunggu Review Mendekati / Melewati SLA
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                PIC telah menyelesaikan perbaikan lapangan. Segera lakukan validasi dokumen dan foto bukti agar penyelesaian resmi tercatat tepat waktu.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-3.5 py-1.5 text-xs font-bold bg-amber-700 text-white rounded-xl shadow-xs hover:bg-amber-800 shrink-0"
          >
            Tinjau Segera
          </button>
        </div>
      )}

      {/* KPI Cards Verifikator */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Antrean Menunggu Verifikasi */}
        <div
          onClick={onSelectPendingVerification}
          className={`p-4 sm:p-5 rounded-2xl border bg-white shadow-2xs cursor-pointer transition hover:shadow-md ${
            statusFilter === "MENUNGGU_VERIFIKASI" && !activeSpecialFilter
              ? "ring-2 ring-purple-600 border-purple-400"
              : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Antrean Verifikasi
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-purple-700">
              {pendingComplaints.length}
            </span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-semibold bg-purple-50 text-purple-900">
              Perlu Keputusan
            </span>
          </div>
        </div>

        {/* Antrean Kritis / Risiko SLA */}
        <div
          onClick={onFilterUrgentReview}
          className={`p-4 sm:p-5 rounded-2xl border bg-white shadow-2xs cursor-pointer transition hover:shadow-md ${
            activeSpecialFilter === "urgent_review"
              ? "ring-2 ring-rose-500 border-rose-300"
              : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Review Kritis SLA
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-rose-600">
              {urgentReview.length}
            </span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-semibold bg-rose-50 text-rose-800">
              Prioritas Review
            </span>
          </div>
        </div>

        {/* Terverifikasi Selesai */}
        <div
          onClick={onSelectApproved}
          className={`p-4 sm:p-5 rounded-2xl border bg-white shadow-2xs cursor-pointer transition hover:shadow-md ${
            statusFilter === "TERVERIFIKASI" && !activeSpecialFilter
              ? "ring-2 ring-emerald-500 border-emerald-300"
              : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Telah Disetujui
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">
              {approvedComplaints.length}
            </span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-800">
              Layanan Valid
            </span>
          </div>
        </div>

        {/* Riwayat Penolakan / Permintaan Revisi */}
        <div className="p-4 sm:p-5 rounded-2xl border bg-white shadow-2xs border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Revisi Diminta
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-amber-700">
              {totalRejectedVerifications}
            </span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-800">
              Kendali Mutu
            </span>
          </div>
        </div>
      </section>

      {/* Ketentuan Verifikasi Mutu */}
      <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-950">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
            🛡️
          </div>
          <div>
            <span className="font-bold block">Kewenangan Pengendalian Mutu Verifikator:</span>
            <span className="text-purple-800 text-[11px]">
              Verifikator bertugas memverifikasi kesesuaian tindakan perbaikan dan foto bukti fisik di lapangan sebelum status keluhan diresmikan Terverifikasi (FR.SM/TI/033.001).
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200">
            ISO / SOP KAI
          </span>
        </div>
      </div>
    </div>
  );
}
