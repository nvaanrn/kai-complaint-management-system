import React from "react";
import { ComplaintData, VerificationResult } from "@/types/database";

interface VerifierOverviewProps {
  complaints: ComplaintData[];
  onSelectPendingVerification: () => void;
  onSelectApproved: () => void;
  statusFilter: string;
}

export default function VerifierOverview({
  complaints,
  onSelectPendingVerification,
  onSelectApproved,
  statusFilter,
}: VerifierOverviewProps) {
  const pendingComplaints = complaints.filter((c) => c.status === "MENUNGGU_VERIFIKASI");
  const inProgressComplaints = complaints.filter((c) => c.status === "DALAM_PENANGANAN");
  const approvedComplaints = complaints.filter((c) => c.status === "TERVERIFIKASI");

  // Total riwayat verifikasi yang pernah ditolak di seluruh keluhan
  const totalRejectedVerifications = complaints.reduce((acc, c) => {
    const countRejected = (c.verifications || []).filter(
      (v) => v.result === VerificationResult.REJECTED
    ).length;
    return acc + countRejected;
  }, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* KPI Cards Verifikator */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Antrean Menunggu Verifikasi */}
        <div
          onClick={onSelectPendingVerification}
          className={`p-4 sm:p-5 rounded-2xl border bg-white shadow-2xs cursor-pointer transition hover:shadow-md ${
            statusFilter === "MENUNGGU_VERIFIKASI"
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

        {/* Proses Lapangan PIC */}
        <div className="p-4 sm:p-5 rounded-2xl border bg-white shadow-2xs border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Proses Lapangan
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-sky-600">
              {inProgressComplaints.length}
            </span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-semibold bg-sky-50 text-sky-800">
              Tindakan PIC
            </span>
          </div>
        </div>

        {/* Terverifikasi Selesai */}
        <div
          onClick={onSelectApproved}
          className={`p-4 sm:p-5 rounded-2xl border bg-white shadow-2xs cursor-pointer transition hover:shadow-md ${
            statusFilter === "TERVERIFIKASI"
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
              Formulir Dokumentasi
            </span>
          </div>
        </div>
      </section>


    </div>
  );
}
