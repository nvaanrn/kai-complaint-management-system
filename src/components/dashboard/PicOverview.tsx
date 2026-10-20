import React from "react";
import { ComplaintData, UserSummary, VerificationResult } from "@/types/database";

interface PicOverviewProps {
  complaints: ComplaintData[];
  currentUser: UserSummary;
  onFilterMyTasks: () => void;
  onFilterRevisions: () => void;
  onSelectStatusFilter: (status: string) => void;
  activeSpecialFilter?: "my_tasks" | "revisions" | null;
  statusFilter: string;
}

export default function PicOverview({
  complaints,
  currentUser,
  onFilterMyTasks,
  onFilterRevisions,
  onSelectStatusFilter,
  activeSpecialFilter,
  statusFilter,
}: PicOverviewProps) {
  // Filter keluhan yang ditugaskan ke PIC saat ini
  const myComplaints = complaints.filter(
    (c) => c.pic && (c.pic.id === currentUser.id || c.pic.email === currentUser.email)
  );

  const myActiveTasks = myComplaints.filter(
    (c) => c.status === "BELUM_DITANGANI" || c.status === "DALAM_PENANGANAN"
  );

  // Keluhan yang ditolak verifikator (perlu revisi)
  const myRevisions = myComplaints.filter((c) => {
    if (c.status !== "DALAM_PENANGANAN") return false;
    const lastVerif = c.verifications && c.verifications.length > 0 ? c.verifications[0] : null;
    return lastVerif?.result === VerificationResult.REJECTED;
  });

  const myWaitingVerification = myComplaints.filter((c) => c.status === "MENUNGGU_VERIFIKASI");
  const myCompleted = myComplaints.filter((c) => c.status === "TERVERIFIKASI");

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Alert Revisi Jika Ada Keluhan Ditolak */}
      {myRevisions.length > 0 && (
        <div
          onClick={onFilterRevisions}
          className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-sm cursor-pointer hover:bg-rose-100/60 transition flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-bounce">⚠️</span>
            <div>
              <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                Ada {myRevisions.length} Keluhan Memerlukan Perbaikan / Revisi
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Verifikator menolak hasil tindakan sebelumnya. Klik di sini untuk melihat catatan revisi dan memperbarui bukti penanganan.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-3.5 py-1.5 text-xs font-bold bg-rose-700 text-white rounded-xl shadow-xs hover:bg-rose-800 shrink-0 cursor-pointer"
          >
            Lihat Revisi
          </button>
        </div>
      )}

      {/* KPI Cards PIC */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Tugas Aktif Saya */}
        <div
          onClick={onFilterMyTasks}
          className={`p-4 sm:p-5 rounded-2xl border bg-white shadow-2xs cursor-pointer transition hover:shadow-md ${
            activeSpecialFilter === "my_tasks"
              ? "ring-2 ring-blue-600 border-blue-400"
              : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tugas Aktif Saya
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-blue-900">{myActiveTasks.length}</span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-semibold bg-blue-50 text-blue-900">
              Perlu Dikerjakan
            </span>
          </div>
        </div>

        {/* Perlu Revisi / Perbaikan */}
        <div
          onClick={onFilterRevisions}
          className={`p-4 sm:p-5 rounded-2xl border bg-white shadow-2xs cursor-pointer transition hover:shadow-md ${
            activeSpecialFilter === "revisions"
              ? "ring-2 ring-rose-500 border-rose-300"
              : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Perlu Revisi
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-rose-600">{myRevisions.length}</span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-semibold bg-rose-50 text-rose-800">
              Ditolak Verifikator
            </span>
          </div>
        </div>

        {/* Menunggu Verifikasi */}
        <div
          onClick={() => onSelectStatusFilter("MENUNGGU_VERIFIKASI")}
          className={`p-4 sm:p-5 rounded-2xl border bg-white shadow-2xs cursor-pointer transition hover:shadow-md ${
            statusFilter === "MENUNGGU_VERIFIKASI" && !activeSpecialFilter
              ? "ring-2 ring-purple-500 border-purple-300"
              : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Menunggu Review
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-purple-600">
              {myWaitingVerification.length}
            </span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-semibold bg-purple-50 text-purple-800">
              Telah Disubmit
            </span>
          </div>
        </div>

        {/* Selesai Terverifikasi */}
        <div
          onClick={() => onSelectStatusFilter("TERVERIFIKASI")}
          className={`p-4 sm:p-5 rounded-2xl border bg-white shadow-2xs cursor-pointer transition hover:shadow-md ${
            statusFilter === "TERVERIFIKASI" && !activeSpecialFilter
              ? "ring-2 ring-emerald-500 border-emerald-300"
              : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Selesai Valid
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">
              {myCompleted.length}
            </span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-800">
              Disetujui
            </span>
          </div>
        </div>
      </section>

      {/* Panduan Alur Kerja PIC */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
            ℹ️
          </div>
          <div>
            <span className="font-bold text-blue-950 block">Prosedur Penanganan Lapangan PIC:</span>
            <span className="text-slate-600 text-[11px]">
              1. Lakukan perbaikan teknis &bull; 2. Tuliskan tindakan korektif & pencegahan &bull; 3. Unggah foto bukti fisik &bull; 4. Ajukan ke Verifikator.
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
            SOP Mutu KAI
          </span>
        </div>
      </div>
    </div>
  );
}
