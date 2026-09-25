"use client";

import React from "react";

interface SourceStat {
  source: string;
  count: number;
  percentage: number;
  color: string;
  bgColor: string;
  textColor: string;
  icon: string;
}

interface SourceComparisonChartProps {
  complaints: Array<{ source: string }>;
  activeFilter: string;
  onSelectSource: (source: string) => void;
}

export default function SourceComparisonChart({
  complaints,
  activeFilter,
  onSelectSource,
}: SourceComparisonChartProps) {
  const total = complaints.length;

  const sourceConfig = [
    {
      source: "Telepon",
      icon: "📞",
      color: "bg-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
    },
    {
      source: "Email",
      icon: "✉️",
      color: "bg-indigo-600",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-700",
    },
    {
      source: "Laporan Langsung",
      icon: "🏢",
      color: "bg-amber-600",
      bgColor: "bg-amber-50",
      textColor: "text-amber-800",
    },
    {
      source: "Nota Dinas",
      icon: "📑",
      color: "bg-violet-600",
      bgColor: "bg-violet-50",
      textColor: "text-violet-700",
    },
    {
      source: "Helpdesk Internal",
      icon: "💻",
      color: "bg-sky-600",
      bgColor: "bg-sky-50",
      textColor: "text-sky-700",
    },
    {
      source: "Survey Pelanggan",
      icon: "📝",
      color: "bg-emerald-600",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-700",
    },
  ];

  // Hitung jumlah per sumber
  const stats: SourceStat[] = sourceConfig.map((cfg) => {
    const count = complaints.filter(
      (c) => c.source.toLowerCase() === cfg.source.toLowerCase()
    ).length;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return {
      ...cfg,
      count,
      percentage,
    };
  });

  // Urutkan dari jumlah terbanyak
  const sortedStats = [...stats].sort((a, b) => b.count - a.count);
  const highestSource = sortedStats[0]?.count > 0 ? sortedStats[0] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Distribusi Saluran Keluhan
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
              Analitik Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Perbandingan persentase keluhan yang diterima dari setiap media pelaporan
          </p>
        </div>

        {highestSource && (
          <div className="flex items-center gap-2 text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70 self-start sm:self-auto">
            <span className="text-slate-400">Saluran Terbanyak:</span>
            <span className="font-bold text-blue-900 flex items-center gap-1">
              <span>{highestSource.icon}</span> {highestSource.source} ({highestSource.percentage}%)
            </span>
          </div>
        )}
      </div>

      {/* Segmented Stacked Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
          {total === 0 ? (
            <div className="w-full bg-slate-200" />
          ) : (
            stats.map((s, idx) => {
              if (s.percentage === 0) return null;
              return (
                <div
                  key={idx}
                  style={{ width: `${s.percentage}%` }}
                  title={`${s.source}: ${s.count} keluhan (${s.percentage}%)`}
                  className={`${s.color} transition-all duration-500 hover:opacity-85 cursor-pointer`}
                  onClick={() => onSelectSource(activeFilter === s.source ? "ALL" : s.source)}
                />
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>0%</span>
          <span>Total: <b>{total} Keluhan Masuk</b></span>
          <span>100%</span>
        </div>
      </div>

      {/* Grid of Sources with Comparative Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map((item) => {
          const isSelected = activeFilter === item.source;
          return (
            <div
              key={item.source}
              onClick={() => onSelectSource(isSelected ? "ALL" : item.source)}
              className={`p-3.5 rounded-xl border transition cursor-pointer select-none ${
                isSelected
                  ? "ring-2 ring-blue-600 bg-blue-50/50 border-blue-300"
                  : "bg-slate-50/50 hover:bg-slate-50 border-slate-200/70 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="text-sm">{item.icon}</span>
                  {item.source}
                </span>
                <span className="font-bold text-slate-900">{item.count}</span>
              </div>

              {/* Individual source progress bar */}
              <div className="mt-2.5 w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full transition-all duration-500`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span className="text-[10px] text-slate-400">Pangsa Pelaporan</span>
                <span className="font-bold text-slate-700">{item.percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {activeFilter !== "ALL" && (
        <div className="pt-2 flex items-center justify-between text-xs text-blue-900 bg-blue-50/80 px-3 py-2 rounded-xl border border-blue-200">
          <span>
            Sedang memfilter tabel berdasarkan saluran: <b>{activeFilter}</b>
          </span>
          <button
            onClick={() => onSelectSource("ALL")}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      )}
    </div>
  );
}
