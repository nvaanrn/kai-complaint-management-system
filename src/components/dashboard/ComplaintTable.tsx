"use client";

import React, { useState, useMemo } from "react";
import { ComplaintData, UserSummary, Role, ComplaintStatus } from "@/types/database";
import { VALID_SOURCES, normalizeComplaintSource } from "@/lib/validation";
import StatusBadge from "./StatusBadge";

interface ComplaintTableProps {
  complaints: ComplaintData[];
  currentUser: UserSummary;
  activeMenu: "overview" | "complaints" | "verifications" | "documents";
  statusFilter: string;
  onSelectStatusFilter: (status: string) => void;
  sourceFilter: string;
  onSelectSourceFilter: (source: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  picOnlyFilter: boolean;
  onTogglePicOnly: (val: boolean) => void;
  onViewDetail: (item: ComplaintData) => void;
  onOpenAction: (item: ComplaintData) => void;
  onDeleteComplaint?: (item: ComplaintData) => void;
  onExportExcel?: () => void;
  isAssignedToCurrentUser: (item: ComplaintData) => boolean;
}

export default function ComplaintTable({
  complaints,
  currentUser,
  activeMenu,
  statusFilter,
  onSelectStatusFilter,
  sourceFilter,
  onSelectSourceFilter,
  searchQuery,
  onSearchQueryChange,
  picOnlyFilter,
  onTogglePicOnly,
  onViewDetail,
  onOpenAction,
  onDeleteComplaint,
  onExportExcel,
  isAssignedToCurrentUser,
}: ComplaintTableProps) {
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Format Date Helper
  const formatDate = (val: Date | string) => {
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const isVerificationMenu = activeMenu === "verifications";
  const isAdminVerification = isVerificationMenu && currentUser.role === Role.ADMIN;

  // Filter Data
  const filteredData = useMemo(() => {
    return complaints.filter((item) => {
      // Jika di menu Verifikasi untuk Admin: HANYA keluhan yang sudah TERVERIFIKASI
      if (isAdminVerification) {
        if (item.status !== "TERVERIFIKASI") {
          return false;
        }
      } else if (isVerificationMenu) {
        // Jika di menu Verifikasi untuk PIC/Verifikator: hanya MENUNGGU_VERIFIKASI atau TERVERIFIKASI
        if (item.status !== "MENUNGGU_VERIFIKASI" && item.status !== "TERVERIFIKASI") {
          return false;
        }
      }

      // 1. Status Filter
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }

      // 2. Source Filter
      if (sourceFilter !== "ALL") {
        const normSource = normalizeComplaintSource(item.source);
        if (normSource !== sourceFilter && item.source !== sourceFilter) {
          return false;
        }
      }

      // 3. PIC Only Filter (Khusus PIC)
      if (picOnlyFilter && !isAssignedToCurrentUser(item)) {
        return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = (item.complaintNumber || "").toLowerCase().includes(q);
        const matchCustomer = (item.customerName || "").toLowerCase().includes(q);
        const matchDesc = (item.description || "").toLowerCase().includes(q);
        const matchPic = (item.pic?.name || "").toLowerCase().includes(q);
        const matchStation = (item.daopOrStation || "").toLowerCase().includes(q);

        if (!matchNumber && !matchCustomer && !matchDesc && !matchPic && !matchStation) {
          return false;
        }
      }

      return true;
    });
  }, [
    complaints,
    statusFilter,
    sourceFilter,
    picOnlyFilter,
    searchQuery,
    isAssignedToCurrentUser,
    isVerificationMenu,
    isAdminVerification,
  ]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sourceFilter, picOnlyFilter, searchQuery]);

  // Pagination Math
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  // Status counts
  const countBelum = complaints.filter((c) => c.status === "BELUM_DITANGANI").length;
  const countDalam = complaints.filter((c) => c.status === "DALAM_PENANGANAN").length;
  const countVerif = complaints.filter((c) => c.status === "MENUNGGU_VERIFIKASI").length;
  const countSelesai = complaints.filter((c) => c.status === "TERVERIFIKASI").length;
  const myTasksCount = complaints.filter(isAssignedToCurrentUser).length;

  // Status Tabs per Role & Active Menu
  const statusTabs = useMemo(() => {
    if (isAdminVerification) {
      // Role Admin di menu Verifikasi: hanya data Terverifikasi, tanpa tab Menunggu Verifikasi
      return [
        { id: "TERVERIFIKASI", label: "Terverifikasi", count: countSelesai },
      ];
    }
    if (isVerificationMenu) {
      // Role Verifikator & PIC di menu Verifikasi: tab Menunggu Verifikasi dan Terverifikasi
      return [
        { id: "MENUNGGU_VERIFIKASI", label: "Menunggu Verifikasi", count: countVerif },
        { id: "TERVERIFIKASI", label: "Terverifikasi", count: countSelesai },
      ];
    }
    // Menu biasa: semua tab
    return [
      { id: "ALL", label: "Semua", count: complaints.length },
      { id: "BELUM_DITANGANI", label: "Belum Ditangani", count: countBelum },
      { id: "DALAM_PENANGANAN", label: "Dalam Penanganan", count: countDalam },
      { id: "MENUNGGU_VERIFIKASI", label: "Menunggu Verifikasi", count: countVerif },
      { id: "TERVERIFIKASI", label: "Terverifikasi", count: countSelesai },
    ];
  }, [isAdminVerification, isVerificationMenu, countSelesai, countVerif, complaints.length, countBelum, countDalam]);

  // Default filter & reset helpers
  const defaultStatusFilter = isAdminVerification
    ? ComplaintStatus.TERVERIFIKASI
    : isVerificationMenu
    ? ComplaintStatus.MENUNGGU_VERIFIKASI
    : "ALL";

  const hasActiveFilters =
    statusFilter !== defaultStatusFilter ||
    sourceFilter !== "ALL" ||
    searchQuery.trim() !== "" ||
    picOnlyFilter;

  const handleResetFilters = () => {
    onSelectStatusFilter(defaultStatusFilter);
    onSelectSourceFilter("ALL");
    onSearchQueryChange("");
    onTogglePicOnly(false);
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            {activeMenu === "verifications"
              ? currentUser.role === Role.ADMIN
                ? "Daftar Keluhan Terverifikasi"
                : "Verifikasi Keluhan Layanan"
              : activeMenu === "overview"
              ? "Daftar Keluhan Terbaru"
              : "Monitoring & Penanganan Keluhan Pelanggan"}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Formulir kendali mutu FR.SM/TI/033.001 &bull; PT Kereta Api Indonesia (Persero)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {/* Ekspor Excel Button — tampil untuk semua role */}
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              type="button"
              title="Unduh rekapitulasi keluhan (.xlsx)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer shadow-2xs active:scale-95"
            >
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Ekspor Rekap Excel</span>
            </button>
          )}

          {/* Toggle PIC Filter */}
          {currentUser.role === Role.PIC && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => onTogglePicOnly(true)}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  picOnlyFilter ? "bg-white text-blue-900 shadow-2xs" : "text-slate-600"
                }`}
              >
                Tugas Saya ({myTasksCount})
              </button>
              <button
                type="button"
                onClick={() => onTogglePicOnly(false)}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  !picOnlyFilter ? "bg-white text-blue-900 shadow-2xs" : "text-slate-600"
                }`}
              >
                Semua Keluhan ({complaints.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Sub-toolbar: Status Tabs, Source Filter */}
      <div className="p-3.5 sm:p-4 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-blue-900 text-white shadow-2xs font-semibold"
                  : "text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusFilter === tab.id
                    ? "bg-blue-800 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters Group (Saluran) */}
        <div className="flex items-center gap-2.5 flex-wrap">

          {/* Saluran Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="source-filter-select" className="text-xs text-slate-500 font-medium">Sumber:</label>
            <select
              id="source-filter-select"
              value={sourceFilter}
              onChange={(e) => onSelectSourceFilter(e.target.value)}
              className="py-1 px-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
            >
              <option value="ALL">Semua Saluran</option>
              {VALID_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] text-blue-700 hover:text-blue-900 underline font-medium px-1 cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* 3. Table Container */}
      <div className="w-full overflow-x-auto">
        <table className="w-full table-fixed text-left text-sm text-slate-600 min-w-[760px] lg:min-w-full">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-200/80">
            <tr>
              <th scope="col" className="px-4 py-3.5 w-[22%]">Tiket & Saluran</th>
              <th scope="col" className="px-4 py-3.5 w-[30%]">Pelapor & Masalah</th>
              <th scope="col" className="px-4 py-3.5 w-[18%]">Petugas PIC</th>
              <th scope="col" className="px-3 py-3.5 w-[18%]">Status</th>
              <th scope="col" className="px-4 py-3.5 w-[12%] text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-slate-400">
                  <div className="max-w-sm mx-auto space-y-2">
                    <span className="text-3xl block">📋</span>
                    <p className="text-sm font-bold text-slate-700">
                      Tidak Ada Keluhan Ditemukan
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {searchQuery
                        ? `Tidak ada hasil untuk pencarian "${searchQuery}".`
                        : isAdminVerification
                        ? "Tidak ada keluhan dengan status terverifikasi saat ini."
                        : statusFilter === "MENUNGGU_VERIFIKASI"
                        ? "Tidak ada tiket yang sedang menunggu verifikasi saat ini."
                        : picOnlyFilter
                        ? "Belum ada tiket keluhan yang ditugaskan kepada Anda."
                        : "Tidak ada data yang sesuai dengan kriteria filter saat ini."}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-semibold hover:bg-blue-100 transition cursor-pointer"
                      >
                        Reset Semua Filter
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onViewDetail(item)}
                  className="hover:bg-slate-50/80 transition cursor-pointer group"
                >
                  {/* 1. Tiket & Saluran */}
                  <td className="px-4 py-3.5">
                    <div className="font-mono font-bold text-slate-900 group-hover:text-blue-900 text-xs truncate">
                      {item.complaintNumber}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                      <span>{formatDate(item.date)}</span>
                      <span>&bull;</span>
                      <span className="font-medium text-slate-600 truncate">{item.source}</span>
                    </div>
                  </td>

                  {/* 2. Pelapor & Masalah */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800 text-xs truncate max-w-[200px]" title={item.customerName}>
                        {item.customerName}
                      </span>
                      {item.daopOrStation && (
                        <span className="text-[9px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 truncate max-w-[140px]">
                          {item.daopOrStation}
                        </span>
                      )}
                    </div>
                    {item.customerContact && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        📞 {item.customerContact}
                      </div>
                    )}
                    <div
                      className="text-[11px] text-slate-500 truncate mt-0.5"
                      title={item.description}
                    >
                      {item.description}
                    </div>
                  </td>

                  {/* 3. Petugas PIC */}
                  <td className="px-4 py-3.5 text-xs">
                    {item.pic ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {item.pic.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-medium text-slate-800 truncate" title={item.pic.name}>
                          {item.pic.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-amber-700 font-medium italic text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                        Belum Ada PIC
                      </span>
                    )}
                  </td>

                  {/* 4. Status */}
                  <td className="px-3 py-3.5">
                    <StatusBadge
                      status={item.status}
                      verifications={item.verifications}
                    />
                  </td>

                  {/* 5. Aksi: Mata (Lihat), Pensil (Edit/Aksi), Sampah (Hapus Admin) */}
                  <td className="px-4 py-3.5 text-right">
                    <div
                      className="flex items-center justify-end gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Tombol Mata: Lihat Detail (Selalu aktif untuk semua role) */}
                      <button
                        type="button"
                        onClick={() => onViewDetail(item)}
                        title="Lihat Detail Keluhan"
                        aria-label={`Lihat detail keluhan ${item.complaintNumber}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 bg-slate-100/80 hover:bg-blue-50 border border-slate-200/60 hover:border-blue-200 transition cursor-pointer shadow-2xs active:scale-95 shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>

                      {/* Status Terkunci untuk Terverifikasi */}
                      {item.status === ComplaintStatus.TERVERIFIKASI && (
                        <span
                          title="Data Terverifikasi & Terkunci"
                          className="px-1.5 py-1 rounded-lg text-emerald-700 bg-emerald-50 border border-emerald-200/60 text-xs font-semibold flex items-center gap-1 shrink-0"
                        >
                          🔒
                        </span>
                      )}

                      {/* Tombol Pensil: Edit / Tindak Lanjut Sesuai Role (Sembunyi jika Terverifikasi atau Menu Verifikasi Admin) */}
                      {!isAdminVerification && item.status !== ComplaintStatus.TERVERIFIKASI && (
                        <button
                          type="button"
                          onClick={() => onOpenAction(item)}
                          title={
                            currentUser.role === Role.PIC
                              ? isAssignedToCurrentUser(item)
                                ? "Eksekusi Keluhan (Tugas Anda)"
                                : "Pantau Penanganan (Ditugaskan ke PIC Lain)"
                              : currentUser.role === Role.ADMIN
                              ? "Edit Data Keluhan & Penugasan PIC"
                              : "Verifikasi Keluhan"
                          }
                          aria-label={`Tindak lanjut keluhan ${item.complaintNumber}`}
                          className={`p-1.5 rounded-lg border transition cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
                            currentUser.role === Role.PIC && isAssignedToCurrentUser(item)
                              ? "text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border-blue-200"
                              : "text-slate-500 hover:text-amber-700 bg-slate-100/80 hover:bg-amber-50 border-slate-200/60 hover:border-amber-200"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}

                      {/* Tombol Sampah: Hapus (Khusus Admin, HANYA jika bukan menu verifikasi, belum terverifikasi, dan belum berdokumen) */}
                      {!isAdminVerification &&
                        item.status !== ComplaintStatus.TERVERIFIKASI &&
                        !item.documentId &&
                        currentUser.role === Role.ADMIN &&
                        onDeleteComplaint && (
                          <button
                            type="button"
                            onClick={() => onDeleteComplaint(item)}
                            title="Hapus Keluhan"
                            aria-label={`Hapus keluhan ${item.complaintNumber}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 bg-slate-100/80 hover:bg-rose-50 border border-slate-200/60 hover:border-rose-200 transition cursor-pointer shadow-2xs active:scale-95 shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Table Footer & Pagination Controls */}
      <div className="p-4 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span>
            Menampilkan{" "}
            <b>{totalItems === 0 ? 0 : startIndex + 1}</b> -{" "}
            <b>{Math.min(startIndex + pageSize, totalItems)}</b> dari total{" "}
            <b>{totalItems}</b> keluhan
          </span>

          {/* Page Size Selector */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <span className="text-slate-400">Baris:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-0.5 px-1.5 text-xs bg-white border border-slate-300 rounded text-slate-700"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Pagination Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-200/70 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-medium cursor-pointer"
            >
              &larr; Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // Show first, last, and within 1 of validPage
                return (
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - validPage) <= 1
                );
              })
              .map((page, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && page - prev > 1;

                return (
                  <React.Fragment key={page}>
                    {showEllipsis && (
                      <span className="px-1 text-slate-400 text-xs">...</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center ${
                        validPage === page
                          ? "bg-blue-900 text-white shadow-2xs"
                          : "text-slate-600 hover:bg-slate-200/70 border border-slate-200"
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              type="button"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-200/70 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-medium cursor-pointer"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
