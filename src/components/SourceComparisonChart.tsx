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

  // Hitung metrik analitik berdasarkan sumber data resmi KAI
  const stats: SourceStat[] = VALID_SOURCES.map((src) => {
    const meta = SOURCE_METADATA[src];
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

  // Urutkan dari jumlah keluhan terbanyak untuk tampilan ranking
  const sortedStats = [...stats].sort((a, b) => b.count - a.count);
  const highestSource = sortedStats[0]?.count > 0 ? sortedStats[0] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
      {/* 1. Header Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Distribusi Saluran Keluhan Pelanggan KAI
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Perbandingan proporsi keluhan yang masuk dari seluruh saluran operasional resmi PT Kereta Api Indonesia (Persero)
          </p>
        </div>

        {highestSource && (
          <div className="flex items-center gap-2 text-xs bg-amber-50/70 border border-amber-200/80 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            <span className="text-amber-800 font-medium">Kanal Dominan:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>{highestSource.icon}</span> {highestSource.source}
              <span className="text-amber-700 font-extrabold">({highestSource.percentage}%)</span>
            </span>
          </div>
        )}
      </div>

      {/* 2. Visual Bar Komposisi Total (Stacked Bar) dengan Legend Terang */}
      <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <span>📊</span>
            <span>Komposisi Keseluruhan Saluran</span>
          </span>
          <span className="text-xs font-bold text-blue-950 bg-blue-100/80 px-2.5 py-0.5 rounded-lg border border-blue-200">
            Total {total} Keluhan Terdata (100%)
          </span>
        </div>

        {/* Stacked Multi-Segment Bar */}
        <div className="w-full h-5 rounded-xl bg-slate-200/80 overflow-hidden flex shadow-inner p-0.5 gap-0.5">
          {total === 0 ? (
            <div className="w-full h-full bg-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-500 font-medium">
              Belum ada data keluhan
            </div>
          ) : (
            stats.map((s, idx) => {
              if (s.count === 0) return null;
              const widthPct = (s.count / total) * 100;
              const isSelected = activeFilter === s.source;

              return (
                <div
                  key={idx}
                  style={{ width: `${widthPct}%` }}
                  title={`${s.source}: ${s.count} keluhan (${s.percentage}%) - Klik untuk filter`}
                  onClick={() => onSelectSource(isSelected ? "ALL" : s.source)}
                  className={`${s.color} h-full rounded-md transition-all duration-300 hover:brightness-110 cursor-pointer flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shadow-xs ${
                    isSelected ? "ring-2 ring-slate-900 ring-offset-1 scale-y-110 z-10" : ""
                  }`}
                >
                  {widthPct >= 12 && <span>{s.percentage}%</span>}
                </div>
              );
            })
          )}
        </div>

        {/* Keterangan Warna (Color Legend) Interaktif */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {stats.map((s) => {
            const isSelected = activeFilter === s.source;
            return (
              <button
                key={s.source}
                type="button"
                onClick={() => onSelectSource(isSelected ? "ALL" : s.source)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100/80"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${s.color} shrink-0`} />
                <span>{s.source}</span>
                <span className={`font-bold ${isSelected ? "text-amber-300" : "text-slate-900"}`}>
                  {s.count} ({s.percentage}%)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Grid Rincian Tiap Saluran (Diurutkan dari Terbanyak) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Rincian Performa per Saluran</span>
          <span className="text-[11px] text-slate-400">Pilih kartu untuk menyaring tabel keluhan</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedStats.map((item, idx) => {
            const isSelected = activeFilter === item.source;
            const itemPercent = total > 0 ? (item.count / total) * 100 : 0;

            return (
              <div
                key={item.source}
                onClick={() => onSelectSource(isSelected ? "ALL" : item.source)}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? "ring-2 ring-blue-600 bg-blue-50/70 border-blue-400 shadow-xs"
                    : "bg-white hover:bg-slate-50/80 border-slate-200/90 hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                {/* Ranking Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl p-1.5 rounded-lg bg-slate-100/80 shrink-0">
                      {item.icon}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 leading-tight">
                        {item.source}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5" title={item.description}>
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-extrabold text-slate-900 block leading-none">
                      {item.count}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Keluhan
                    </span>
                  </div>
                </div>

                {/* Progress Bar Horizontal per Saluran */}
                <div className="mt-3.5 space-y-1.5">
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${itemPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 text-[10px]">
                      Peringkat #{idx + 1}
                    </span>
                    <span className="font-extrabold text-slate-700">
                      {item.percentage}% dari total
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-2 pt-2 border-t border-blue-200 text-[10px] font-bold text-blue-700 flex items-center justify-between">
                    <span>✓ Sedang Difilter</span>
                    <span className="text-blue-500 hover:underline">Lepas Filter</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Active Filter Notice */}
      {activeFilter !== "ALL" && (
        <div className="flex items-center justify-between text-xs text-blue-900 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-200">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>
              Menampilkan hanya keluhan dari saluran: <b>{activeFilter}</b>
            </span>
          </span>
          <button
            type="button"
            onClick={() => onSelectSource("ALL")}
            className="text-xs font-bold text-blue-700 hover:text-blue-950 underline cursor-pointer"
          >
            Tampilkan Semua Saluran
          </button>
        </div>
      )}
    </div>
  );
}
