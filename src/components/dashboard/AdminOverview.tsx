import React from "react";
import { ComplaintData } from "@/types/database";
import SourceComparisonChart from "@/components/SourceComparisonChart";

interface AdminOverviewProps {
  complaints: ComplaintData[];
  statusFilter: string;
  sourceFilter: string;
  onSelectStatusFilter: (status: string) => void;
  onSelectSourceFilter: (source: string) => void;
  onFilterUnassigned: () => void;
  activeSpecialFilter?: "unassigned" | null;
}

export default function AdminOverview({
  complaints,
  statusFilter,
  sourceFilter,
  onSelectStatusFilter,
  onSelectSourceFilter,
  onFilterUnassigned,
  activeSpecialFilter,
}: AdminOverviewProps) {
  // Hitung metrik status
  const countBelum = complaints.filter((c) => c.status === "BELUM_DITANGANI").length;
  const countDalam = complaints.filter((c) => c.status === "DALAM_PENANGANAN").length;
  const countVerif = complaints.filter((c) => c.status === "MENUNGGU_VERIFIKASI").length;
  const countSelesai = complaints.filter((c) => c.status === "TERVERIFIKASI").length;

  // Hitung tiket yang belum ditugaskan (Unassigned PIC)
  const unassignedCount = complaints.filter(
    (c) => !c.pic && c.status !== "TERVERIFIKASI"
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Kartu Peringatan Operasional Admin (Unassigned PIC) */}
      {unassignedCount > 0 && (
        <div
          onClick={onFilterUnassigned}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-4 ${
            activeSpecialFilter === "unassigned"
              ? "bg-amber-100/70 border-amber-400 ring-2 ring-amber-500 shadow-sm"
              : "bg-amber-50/70 border-amber-200 hover:bg-amber-100/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
              👤
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Keluhan Belum Ditugaskan
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Terdapat {unassignedCount} keluhan yang belum memiliki petugas PIC penanggung jawab. Segera tentukan PIC untuk memproses penanganan.
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-2xl font-black text-amber-700">{unassignedCount}</span>
            <span className="block text-[10px] text-amber-800 font-semibold">Tiket</span>
          </div>
        </div>
      )}

      {/* KPI Stat Cards Utama */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Belum Ditangani */}
        <div
          onClick={() => onSelectStatusFilter("BELUM_DITANGANI")}
          className={`p-4 sm:p-5 rounded-2xl border bg-white shadow-2xs cursor-pointer transition hover:shadow-md ${
            statusFilter === "BELUM_DITANGANI" && !activeSpecialFilter
              ? "ring-2 ring-amber-500 border-amber-300"
              : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Belum Ditangani
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-amber-600">{countBelum}</span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-800">
              Antrean Baru
            </span>
          </div>
        </div>

        {/* Dalam Penanganan */}
        <div
          onClick={() => onSelectStatusFilter("DALAM_PENANGANAN")}
          className={`p-4 sm:p-5 rounded-2xl border bg-white shadow-2xs cursor-pointer transition hover:shadow-md ${
            statusFilter === "DALAM_PENANGANAN" && !activeSpecialFilter
              ? "ring-2 ring-sky-500 border-sky-300"
              : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Dalam Penanganan
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-sky-600">{countDalam}</span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-semibold bg-sky-50 text-sky-800">
              Proses PIC
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
              Menunggu Verifikasi
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-purple-600">{countVerif}</span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-semibold bg-purple-50 text-purple-800">
              Review Mutu
            </span>
          </div>
        </div>

        {/* Terverifikasi */}
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
              Terverifikasi
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">{countSelesai}</span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-800">
              Selesai Valid
            </span>
          </div>
        </div>
      </section>

      {/* Chart Perbandingan Saluran */}
      <div className="animate-in fade-in slide-in-from-top-2 duration-150">
        <SourceComparisonChart
          complaints={complaints}
          activeFilter={sourceFilter}
          onSelectSource={(src) => onSelectSourceFilter(src)}
        />
      </div>
    </div>
  );
}
