"use client";

import React from "react";
import {
  VALID_SOURCES,
  SOURCE_METADATA,
  normalizeComplaintSource,
  ComplaintSource,
} from "@/lib/sources";

interface SourceStat {
  source: ComplaintSource;
  count: number;
  percentage: number;
  color: string;
  bgColor: string;
  textColor: string;
  icon: string;
  description: string;
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

  // Hitung metrik analitik berdasarkan sumber data resmi KAI (Single Source of Truth)
  const stats: SourceStat[] = VALID_SOURCES.map((src) => {
    const meta = SOURCE_METADATA[src];
    // Menghitung keluhan dengan toleransi normalisasi untuk data historis
    const count = complaints.filter(
      (c) => normalizeComplaintSource(c.source) === src
    ).length;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return {
      source: src,
      count,
      percentage,
      color: meta.color,
      bgColor: meta.bgColor,
      textColor: meta.textColor,
      icon: meta.icon,
      description: meta.description,
    };
  });

  // Urutkan dari jumlah keluhan terbanyak untuk tampilan kartu
  const sortedStats = [...stats].sort((a, b) => b.count - a.count);
  const highestSource = sortedStats[0]?.count > 0 ? sortedStats[0] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Distribusi Saluran Keluhan Resmi KAI
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Analitik Terkini
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Komposisi persentase keluhan yang diterima dari seluruh saluran resmi layanan PT KAI
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
              if (s.count === 0) return null;
              // Gunakan lebar aktual proporsional agar 100% akurat
              const widthPct = (s.count / total) * 100;
              return (
                <div
                  key={idx}
                  style={{ width: `${widthPct}%` }}
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
          <span>Total: <b>{total} Keluhan Terdata</b></span>
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
                  style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span className="text-[10px] text-slate-400 truncate max-w-[130px]" title={item.description}>
                  {item.description}
                </span>
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
