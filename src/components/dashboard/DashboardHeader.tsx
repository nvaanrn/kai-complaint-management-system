"use client";

import React from "react";
import { Role, UserSummary } from "@/types/database";

interface DashboardHeaderProps {
  currentUser: UserSummary;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenMobileMenu: () => void;
  onOpenCreateModal: () => void;
}

export default function DashboardHeader({
  currentUser,
  searchQuery,
  onSearchChange,
  onOpenMobileMenu,
  onOpenCreateModal,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
      {/* Search & Mobile Toggle */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Buka menu navigasi"
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="relative w-full">
          <input
            type="text"
            placeholder="Cari nomor tiket, nama pelapor, PIC..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
          />
          <svg
            className="w-4 h-4 absolute left-3 top-2.5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Date & Admin Action */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70">
          <span>📅</span>
          <span>
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        {currentUser.role === Role.ADMIN && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 active:scale-95 rounded-xl transition shadow-xs cursor-pointer shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Catat Keluhan Baru</span>
            <span className="sm:hidden">Baru</span>
          </button>
        )}
      </div>
    </header>
  );
}
