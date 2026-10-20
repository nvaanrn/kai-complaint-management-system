"use client";

import React from "react";
import Image from "next/image";
import LogoutButton from "@/components/LogoutButton";
import { UserSummary, Role } from "@/types/database";
import Link from "next/link";

interface DashboardSidebarProps {
  currentUser: UserSummary;
  activeMenu: "overview" | "complaints" | "verifications" | "documents";
  setActiveMenu: (menu: "overview" | "complaints" | "verifications" | "documents") => void;
  totalComplaints: number;
  pendingVerifications: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenDocModal: () => void;
  onResetSpecialFilters: () => void;
}

export default function DashboardSidebar({
  currentUser,
  activeMenu,
  setActiveMenu,
  totalComplaints,
  pendingVerifications,
  isOpenMobile,
  onCloseMobile,
  onOpenDocModal,
  onResetSpecialFilters,
}: DashboardSidebarProps) {
  const handleSelectMenu = (menu: "overview" | "complaints" | "verifications" | "documents") => {
    setActiveMenu(menu);
    onResetSpecialFilters();
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-150 print:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 transition-transform duration-200 lg:translate-x-0 print:hidden ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-lg shrink-0">
              <Image
                src="/kai-logo.png"
                alt="KAI Logo"
                width={80}
                height={26}
                className="h-6 w-auto object-contain"
                unoptimized
              />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase block">
                FR.SM/TI/033.001
              </span>
              <span className="text-xs font-black tracking-tight text-white block">
                SPKP KAI PERSERO
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Tutup menu samping"
            className="lg:hidden text-slate-400 hover:text-white text-lg p-1"
          >
            &times;
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Menu Navigasi
          </div>

          {/* Overview */}
          <button
            type="button"
            onClick={() => handleSelectMenu("overview")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeMenu === "overview"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Ringkasan & Metrik</span>
          </button>

          {/* Complaints Table */}
          <button
            type="button"
            onClick={() => handleSelectMenu("complaints")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeMenu === "complaints"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Daftar Keluhan</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeMenu === "complaints"
                  ? "bg-blue-700 text-white"
                  : "bg-slate-800 text-slate-300 border border-slate-700"
              }`}
            >
              {totalComplaints}
            </span>
          </button>

          {/* Verification Menu */}
                      {/* Verification Menu */}
            <Link
              href="/dashboard?menu=verifications"
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeMenu === "verifications"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Verifikasi</span>
              </div>
              {currentUser.role !== Role.ADMIN && pendingVerifications > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-900/80 text-purple-200 border border-purple-700 animate-pulse">
                  {pendingVerifications}
                </span>
              )}
            </Link>

          {/* Dokumen Cetak KAI */}
          <button
            type="button"
            onClick={onOpenDocModal}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Dokumen Cetak KAI</span>
          </button>


        </nav>

        {/* User Profile Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {currentUser.name || "Petugas SPKP"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                    currentUser.role === Role.ADMIN
                      ? "bg-rose-950 text-rose-300 border-rose-800"
                      : currentUser.role === Role.VERIFIKATOR
                      ? "bg-purple-950 text-purple-300 border-purple-800"
                      : "bg-blue-950 text-blue-300 border-blue-800"
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>
    </>
  );
}
