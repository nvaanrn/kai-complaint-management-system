"use client";

import React, { useState, useTransition } from "react";
import { ComplaintStatus, Role, VerificationResult } from "@prisma/client";
import {
  createComplaint,
  assignPIC,
  updateComplaintProgress,
  verifyComplaint,
  deleteComplaint,
  editComplaintDetails,
} from "@/app/actions/complaints";
import SourceComparisonChart from "@/components/SourceComparisonChart";
import KaiDocumentModal from "@/components/KaiDocumentModal";
import LogoutButton from "@/components/LogoutButton";
import Image from "next/image";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ComplaintData {
  id: string;
  complaintNumber: string;
  date: Date | string;
  customerName: string;
  source: string;
  description: string;
  status: ComplaintStatus;
  correctiveAction: string | null;
  preventiveAction: string | null;
  notes: string | null;
  picId: string | null;
  pic: UserSummary | null;
  verifications?: Array<{
    id: string;
    result: VerificationResult;
    feedback: string | null;
    verifiedAt: Date | string;
    verifier: {
      name: string;
      role: Role;
    };
  }>;
  createdAt: Date | string;
}

interface DashboardClientProps {
  complaints: ComplaintData[];
  picList: UserSummary[];
  currentUser: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: Role;
  };
}

export default function DashboardClient({
  complaints,
  picList,
  currentUser,
}: DashboardClientProps) {
  const [isPending, startTransition] = useTransition();

  // Navigation Active State in Left Sidebar
  const [activeMenu, setActiveMenu] = useState<"overview" | "complaints" | "verifications" | "documents">("overview");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [picOnlyFilter, setPicOnlyFilter] = useState(currentUser.role === Role.PIC);
  const [showAdminChart, setShowAdminChart] = useState(false);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintData | null>(null);
  const [selectedViewComplaint, setSelectedViewComplaint] = useState<ComplaintData | null>(null);
  const [complaintToDelete, setComplaintToDelete] = useState<ComplaintData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Form State: Catat Keluhan Baru
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newSource, setNewSource] = useState("Telepon");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newPicId, setNewPicId] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Form State: Tindak Lanjut PIC / Admin
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editSource, setEditSource] = useState("Telepon");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPicId, setEditPicId] = useState<string>("");
  const [editCorrectiveAction, setEditCorrectiveAction] = useState("");
  const [editPreventiveAction, setEditPreventiveAction] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Form State: Verifikasi
  const [verificationFeedback, setVerificationFeedback] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Mobile sidebar toggle
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Sync selected complaint when opened
  const handleOpenDetail = (complaint: ComplaintData) => {
    setSelectedComplaint(complaint);
    setEditCustomerName(complaint.customerName || "");
    setEditSource(complaint.source || "Telepon");
    setEditDate(
      complaint.date
        ? new Date(complaint.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setEditDescription(complaint.description || "");
    setEditPicId(complaint.picId || "");
    setEditCorrectiveAction(complaint.correctiveAction || "");
    setEditPreventiveAction(complaint.preventiveAction || "");
    setEditNotes(complaint.notes || "");
    setVerificationFeedback("");
  };

  // 1. Submit: Catat Keluhan Baru
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newDescription) {
      showToast("Nama pelapor dan uraian keluhan wajib diisi.", "error");
      return;
    }

    setCreateLoading(true);
    startTransition(async () => {
      const res = await createComplaint({
        customerName: newCustomerName,
        source: newSource,
        date: newDate,
        picId: newPicId || null,
        description: newDescription,
      });

      setCreateLoading(false);
      if (res.success) {
        showToast(`Keluhan baru ${res.data?.complaintNumber} berhasil dicatat!`);
        setIsCreateModalOpen(false);
        setNewCustomerName("");
        setNewSource("Telepon");
        setNewPicId("");
        setNewDescription("");
        setNewDate(new Date().toISOString().split("T")[0]);
      } else {
        showToast(res.error || "Gagal mencatat keluhan", "error");
      }
    });
  };

  // 2. Submit: Tindakan Penanganan PIC & Submit Verifikasi
  const handleUpdateProgress = async (submitForVerification = false) => {
    if (!selectedComplaint) return;

    const corrective = editCorrectiveAction.trim();
    const preventive = editPreventiveAction.trim();

    // Validasi dasar: Form tidak boleh kosong sama sekali
    if (!corrective && !preventive) {
      showToast("Formulir penanganan masih kosong. Tindakan perbaikan wajib diisi.", "error");
      return;
    }

    // Validasi submit verifikasi: Wajib diisi keduanya
    if (submitForVerification && (!corrective || !preventive)) {
      showToast("Tindakan perbaikan dan tindakan pencegahan wajib diisi sebelum diajukan untuk verifikasi.", "error");
      return;
    }

    setActionLoading(true);
    startTransition(async () => {
      const res = await updateComplaintProgress(selectedComplaint.id, {
        correctiveAction: corrective,
        preventiveAction: preventive,
        notes: editNotes.trim(),
        submitForVerification,
      });

      setActionLoading(false);
      if (res.success) {
        const msg = submitForVerification
          ? "Penanganan berhasil diajukan untuk verifikasi!"
          : "Tindakan penanganan berhasil disimpan.";
        showToast(msg);
        setSelectedComplaint(null);
      } else {
        showToast(res.error || "Gagal memperbarui tindakan", "error");
      }
    });
  };

  // 3. Submit: Tugaskan PIC (Khusus Admin)
  const handleAssignPicOnly = async () => {
    if (!selectedComplaint || !editPicId) return;

    setActionLoading(true);
    startTransition(async () => {
      const res = await assignPIC(selectedComplaint.id, editPicId);
      setActionLoading(false);
      if (res.success) {
        showToast("PIC berhasil ditugaskan!");
        setSelectedComplaint(null);
      } else {
        showToast(res.error || "Gagal menugaskan PIC", "error");
      }
    });
  };

  // 4. Submit: Verifikasi (Approve / Reject)
  const handleVerify = async (result: VerificationResult) => {
    if (!selectedComplaint) return;

    if (result === VerificationResult.REJECTED && (!verificationFeedback || verificationFeedback.trim() === "")) {
      showToast("Alasan penolakan wajib diisi agar PIC dapat melakukan perbaikan.", "error");
      return;
    }

    setVerifyLoading(true);
    startTransition(async () => {
      const res = await verifyComplaint(selectedComplaint.id, {
        result,
        feedback: verificationFeedback,
      });

      setVerifyLoading(false);
      if (res.success) {
        const msg =
          result === VerificationResult.APPROVED
            ? "Keluhan berhasil disetujui & diverifikasi tuntas!"
            : "Keluhan ditolak dan dikembalikan ke PIC untuk perbaikan.";
        showToast(msg);
        setSelectedComplaint(null);
      } else {
        showToast(res.error || "Gagal memproses verifikasi", "error");
      }
    });
  };

  // 5. Submit: Hapus Keluhan (Khusus Admin)
  const handleDeleteComplaint = async () => {
    if (!complaintToDelete) return;

    setDeleteLoading(true);
    startTransition(async () => {
      const res = await deleteComplaint(complaintToDelete.id);
      setDeleteLoading(false);
      if (res.success) {
        showToast(`Keluhan ${complaintToDelete.complaintNumber} berhasil dihapus.`);
        setComplaintToDelete(null);
      } else {
        showToast(res.error || "Gagal menghapus keluhan", "error");
      }
    });
  };

  // 6. Submit: Perbarui Data Registrasi Keluhan (Khusus Admin)
  const handleSaveComplaintDetails = async () => {
    if (!selectedComplaint) return;

    setActionLoading(true);
    startTransition(async () => {
      const res = await editComplaintDetails(selectedComplaint.id, {
        customerName: editCustomerName,
        source: editSource,
        date: editDate,
        description: editDescription,
        picId: editPicId || null,
      });

      setActionLoading(false);
      if (res.success) {
        showToast("Data pokok keluhan berhasil diperbarui!");
        setSelectedComplaint(null);
      } else {
        showToast(res.error || "Gagal memperbarui data keluhan", "error");
      }
    });
  };

  // Filter complaints list
  const filteredComplaints = complaints.filter((item) => {
    // Menu Verifikasi Filter
    if (activeMenu === "verifications" && item.status !== ComplaintStatus.MENUNGGU_VERIFIKASI) {
      return false;
    }

    // PIC Only Filter
    if (picOnlyFilter && item.picId !== currentUser.id) {
      return false;
    }

    // Status filter
    if (statusFilter !== "ALL" && item.status !== statusFilter) {
      return false;
    }

    // Source filter
    if (sourceFilter !== "ALL" && item.source !== sourceFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchNumber = item.complaintNumber.toLowerCase().includes(q);
      const matchCustomer = item.customerName.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchPic = item.pic?.name.toLowerCase().includes(q) || false;
      return matchNumber || matchCustomer || matchDesc || matchPic;
    }

    return true;
  });

  // Dynamic counts
  const countBelum = complaints.filter((c) => c.status === ComplaintStatus.BELUM_DITANGANI).length;
  const countDalam = complaints.filter((c) => c.status === ComplaintStatus.DALAM_PENANGANAN).length;
  const countVerif = complaints.filter((c) => c.status === ComplaintStatus.MENUNGGU_VERIFIKASI).length;
  const countSelesai = complaints.filter((c) => c.status === ComplaintStatus.TERVERIFIKASI).length;
  const countMyTasks = complaints.filter((c) => c.picId === currentUser.id).length;

  const formatDate = (val: Date | string) => {
    const d = new Date(val);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Status Badge Component
  const renderStatusBadge = (status: ComplaintStatus, verifications?: ComplaintData["verifications"]) => {
    const lastVerif = verifications && verifications.length > 0 ? verifications[0] : null;
    const isRejectedBefore = lastVerif?.result === VerificationResult.REJECTED;

    switch (status) {
      case ComplaintStatus.BELUM_DITANGANI:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Belum Ditangani
          </span>
        );
      case ComplaintStatus.DALAM_PENANGANAN:
        return (
          <div className="flex flex-col items-start gap-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
              Dalam Penanganan
            </span>
            {isRejectedBefore && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                Perlu Perbaikan Ulang
              </span>
            )}
          </div>
        );
      case ComplaintStatus.MENUNGGU_VERIFIKASI:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
            Menunggu Verifikasi
          </span>
        );
      case ComplaintStatus.TERVERIFIKASI:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Terverifikasi
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans antialiased">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium transition duration-300 flex items-center gap-2.5 ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <span className="text-base">{toast.type === "success" ? "✅" : "⚠️"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. LEFT-ALIGNED SIDEBAR (DESKTOP & RESPONSIVE) */}
      {/* ======================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Header with Official KAI Logo */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex flex-col">
              <Image
                src="/kai-logo.png"
                alt="KAI Logo Resmi"
                width={120}
                height={36}
                className="h-9 w-auto object-contain self-start"
                priority
                unoptimized
              />
              <div className="mt-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  SPKP FR.SM/TI/033.001
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Kendali Mutu Keluhan Pelanggan
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-600 text-lg"
            >
              &times;
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Menu Navigasi
            </div>

            <button
              onClick={() => {
                setActiveMenu("overview");
                setStatusFilter("ALL");
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeMenu === "overview"
                  ? "bg-blue-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Ringkasan & Metrik</span>
            </button>

            <button
              onClick={() => {
                setActiveMenu("complaints");
                setStatusFilter("ALL");
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeMenu === "complaints"
                  ? "bg-blue-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Daftar Keluhan</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeMenu === "complaints" ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {complaints.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveMenu("verifications");
                setStatusFilter(ComplaintStatus.MENUNGGU_VERIFIKASI);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeMenu === "verifications"
                  ? "bg-blue-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Verifikasi Mutu</span>
              </div>
              {countVerif > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 animate-pulse">
                  {countVerif}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsDocModalOpen(true)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Dokumen Cetak KAI</span>
            </button>
          </nav>

          {/* User Profile Card at Sidebar Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-900 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {currentUser.name || "Petugas SPKP"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                    currentUser.role === Role.ADMIN
                      ? "bg-rose-100 text-rose-800"
                      : currentUser.role === Role.VERIFIKATOR
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-900"
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT AREA (RIGHT OF SIDEBAR) */}
      {/* ======================================================== */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="relative w-64 md:w-80">
              <input
                type="text"
                placeholder="Cari keluhan, pelapor, PIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
              <svg
                className="w-4 h-4 absolute left-3 top-2 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70">
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

            {/* Tombol Catat Keluhan (Admin & Staf) */}
            {currentUser.role === Role.ADMIN && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Catat Keluhan Baru</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Body */}
        <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Hero Welcome Greeting */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6 md:p-7 shadow-xs relative overflow-hidden">
            <div className="relative z-10 space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-blue-200 border border-white/10">
                PT Kereta Api Indonesia (Persero)
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Selamat Datang, {currentUser.name || "Petugas SPKP"} 👋
              </h2>
              <p className="text-xs md:text-sm text-blue-100/80 max-w-2xl leading-relaxed">
                {currentUser.role === Role.ADMIN && "Anda memiliki kewenangan penuh mencatat keluhan, menentukan PIC, serta mengelola dokumen kendali mutu FR.SM/TI/033.001."}
                {currentUser.role === Role.PIC && `Terdapat ${countMyTasks} keluhan yang ditugaskan ke Anda. Segera lakukan tindakan perbaikan & ajukan verifikasi.`}
                {currentUser.role === Role.VERIFIKATOR && `Terdapat ${countVerif} keluhan menunggu verifikasi mutu. Periksa hasil penanganan teknis dari PIC.`}
              </p>
            </div>
          </div>

          {/* KPI Soft Pastel Stat Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => setStatusFilter("BELUM_DITANGANI")}
              className={`p-5 rounded-2xl border bg-white shadow-2xs cursor-pointer transition hover:shadow-md ${
                statusFilter === "BELUM_DITANGANI"
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
                <span className="text-3xl font-black text-amber-600">{countBelum}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-800">
                  Antrean Baru
                </span>
              </div>
            </div>

            <div
              onClick={() => setStatusFilter("DALAM_PENANGANAN")}
              className={`p-5 rounded-2xl border bg-white shadow-2xs cursor-pointer transition hover:shadow-md ${
                statusFilter === "DALAM_PENANGANAN"
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
                <span className="text-3xl font-black text-sky-600">{countDalam}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-sky-50 text-sky-800">
                  Proses PIC
                </span>
              </div>
            </div>

            <div
              onClick={() => setStatusFilter("MENUNGGU_VERIFIKASI")}
              className={`p-5 rounded-2xl border bg-white shadow-2xs cursor-pointer transition hover:shadow-md ${
                statusFilter === "MENUNGGU_VERIFIKASI"
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
                <span className="text-3xl font-black text-purple-600">{countVerif}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-purple-50 text-purple-800">
                  Review Mutu
                </span>
              </div>
            </div>

            <div
              onClick={() => setStatusFilter("TERVERIFIKASI")}
              className={`p-5 rounded-2xl border bg-white shadow-2xs cursor-pointer transition hover:shadow-md ${
                statusFilter === "TERVERIFIKASI"
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
                <span className="text-3xl font-black text-emerald-600">{countSelesai}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-800">
                  Selesai Valid
                </span>
              </div>
            </div>
          </section>

          {/* ======================================================== */}
          {/* GRAFIK PERBANDINGAN SUMBER KELUHAN (COLLAPSIBLE UNTUK ADMIN) */}
          {/* ======================================================== */}
          {currentUser.role === Role.ADMIN && showAdminChart && (
            <div className="animate-in fade-in slide-in-from-top-3 duration-200">
              <SourceComparisonChart
                complaints={complaints}
                activeFilter={sourceFilter}
                onSelectSource={(src) => setSourceFilter(src)}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TABEL MONITORING & PENGELOLAAN KELUHAN */}
          {/* ======================================================== */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Table Control Header */}
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {activeMenu === "verifications"
                    ? "Antrean Verifikasi Mutu Layanan"
                    : "Monitoring & Penanganan Keluhan Pelanggan"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Prosedur kendali mutu keluhan FR.SM/TI/033.001 PT Kereta Api Indonesia (Persero)
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                {/* Admin Chart Toggle Button */}
                {currentUser.role === Role.ADMIN && (
                  <button
                    onClick={() => setShowAdminChart(!showAdminChart)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                      showAdminChart
                        ? "bg-blue-50 text-blue-900 border-blue-200 shadow-2xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>📊</span>
                    <span>{showAdminChart ? "Tutup Analitik Saluran" : "Buka Analisis Saluran"}</span>
                  </button>
                )}

                {/* PIC Filter Toggle */}
                {currentUser.role === Role.PIC && (
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setPicOnlyFilter(true)}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        picOnlyFilter ? "bg-white text-blue-900 shadow-2xs" : "text-slate-600"
                      }`}
                    >
                      Tugas Saya ({countMyTasks})
                    </button>
                    <button
                      onClick={() => setPicOnlyFilter(false)}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        !picOnlyFilter ? "bg-white text-blue-900 shadow-2xs" : "text-slate-600"
                      }`}
                    >
                      Semua Keluhan ({complaints.length})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sub-toolbar: Tabs & Source Dropdown */}
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {[
                  { id: "ALL", label: "Semua", count: complaints.length },
                  { id: "BELUM_DITANGANI", label: "Belum Ditangani", count: countBelum },
                  { id: "DALAM_PENANGANAN", label: "Dalam Penanganan", count: countDalam },
                  { id: "MENUNGGU_VERIFIKASI", label: "Menunggu Verifikasi", count: countVerif },
                  { id: "TERVERIFIKASI", label: "Terverifikasi", count: countSelesai },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                      statusFilter === tab.id
                        ? "bg-blue-900 text-white shadow-2xs"
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

              {/* Source Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Sumber:</span>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="py-1 px-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="ALL">Semua Sumber</option>
                  <option value="Telepon">Telepon</option>
                  <option value="Email">Email</option>
                  <option value="Laporan Langsung">Laporan Langsung</option>
                  <option value="Nota Dinas">Nota Dinas</option>
                  <option value="Helpdesk Internal">Helpdesk Internal</option>
                  <option value="Survey Pelanggan">Survey Pelanggan</option>
                </select>
              </div>
            </div>

            {/* 5 Compact Responsive Columns - Pas di Layar Tanpa Geser */}
            <div className="w-full overflow-x-auto">
              <table className="w-full table-fixed text-left text-sm text-slate-600 min-w-[700px] lg:min-w-full">
                <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3.5 w-[20%]">Tiket & Saluran</th>
                    <th className="px-4 py-3.5 w-[32%]">Pelapor & Masalah</th>
                    <th className="px-4 py-3.5 w-[18%]">Petugas PIC</th>
                    <th className="px-3 py-3.5 w-[16%]">Status</th>
                    <th className="px-4 py-3.5 w-[14%] text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                        <p className="text-sm font-semibold text-slate-600">Tidak ada keluhan ditemukan.</p>
                        <p className="text-xs text-slate-400 mt-1">Coba atur ulang pencarian atau filter status.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedViewComplaint(item)}
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
                          <div className="font-bold text-slate-800 text-xs truncate" title={item.customerName}>
                            {item.customerName}
                          </div>
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
                                {item.pic.name.charAt(0)}
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
                          {renderStatusBadge(item.status, item.verifications)}
                        </td>

                        {/* 5. Aksi: Mata (Lihat), Pensil (Edit), Sampah (Hapus - Khusus Admin) */}
                        <td className="px-4 py-3.5 text-right">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Tombol Mata: Lihat Detail (Semua Role) */}
                            <button
                              type="button"
                              onClick={() => setSelectedViewComplaint(item)}
                              title="Lihat Detail Keluhan"
                              aria-label="Lihat Detail Keluhan"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 bg-slate-100/80 hover:bg-blue-50 border border-slate-200/60 hover:border-blue-200 transition cursor-pointer shadow-2xs active:scale-95 shrink-0"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            {/* Tombol Pensil: Edit / Tindak Lanjut */}
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(item)}
                              title="Edit / Tindak Lanjut Keluhan"
                              aria-label="Edit / Tindak Lanjut Keluhan"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 bg-slate-100/80 hover:bg-amber-50 border border-slate-200/60 hover:border-amber-200 transition cursor-pointer shadow-2xs active:scale-95 shrink-0"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>

                            {/* Tombol Sampah: Hapus (HANYA MUNCUL DI DASHBOARD ADMIN) */}
                            {currentUser.role === Role.ADMIN && (
                              <button
                                type="button"
                                onClick={() => setComplaintToDelete(item)}
                                title="Hapus Keluhan"
                                aria-label="Hapus Keluhan"
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

            {/* Table Footer */}
            <div className="p-4 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Menampilkan {filteredComplaints.length} dari total {complaints.length} keluhan</span>
              <span className="font-mono text-[11px] text-slate-400">Dokumen FR.SM/TI/033.001</span>
            </div>
          </section>
        </main>
      </div>

      {/* ======================================================== */}
      {/* 3. MODAL: CATAT KELUHAN BARU (KHUSUS ADMIN) */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 bg-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src="/kai-logo.png" alt="KAI Logo" width={80} height={28} className="h-7 w-auto bg-white p-1 rounded object-contain" unoptimized />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                    Formulir Registrasi Keluhan
                  </span>
                  <h3 className="text-lg font-bold">Catat Keluhan Pelanggan Baru</h3>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Personil / Pengguna Layanan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bapak Hendra (Divisi Logistik)"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Sumber Keluhan
                  </label>
                  <select
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 bg-white"
                  >
                    <option value="Telepon">Telepon</option>
                    <option value="Email">Email</option>
                    <option value="Laporan Langsung">Laporan Langsung</option>
                    <option value="Nota Dinas">Nota Dinas</option>
                    <option value="Helpdesk Internal">Helpdesk Internal</option>
                    <option value="Survey Pelanggan">Survey Pelanggan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal Pelaporan
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tugaskan Petugas PIC (Opsional)
                </label>
                <select
                  value={newPicId}
                  onChange={(e) => setNewPicId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 bg-white"
                >
                  <option value="">-- Pilih PIC Penanggung Jawab --</option>
                  {picList.map((pic) => (
                    <option key={pic.id} value={pic.id}>
                      {pic.name} ({pic.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Uraian Lengkap Keluhan / Masalah *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Rincian kendala atau keluhan yang dialami..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createLoading || isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {createLoading ? "Menyimpan Data..." : "Simpan Keluhan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL: DETAIL & TINDAK LANJUT KELUHAN (ROLE-BASED) */}
      {/* ======================================================== */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded tracking-wide flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Mode Edit</span>
                  </span>
                  <span className="font-mono text-xs font-bold bg-blue-600 px-2.5 py-0.5 rounded text-white tracking-wide">
                    {selectedComplaint.complaintNumber}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDate(selectedComplaint.date)}
                  </span>
                </div>
                <h3 className="text-lg font-bold mt-1 text-slate-100">
                  {selectedComplaint.customerName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition text-lg"
              >
                &times;
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Stepper Timeline */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
                  Siklus Hidup Keluhan KAI:
                </span>
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                    1. Dicatat
                  </div>
                  <div
                    className={`p-2 rounded-lg border ${
                      selectedComplaint.status !== ComplaintStatus.BELUM_DITANGANI
                        ? "bg-sky-100 text-sky-900 border-sky-300"
                        : "bg-slate-100 text-slate-400 border-slate-200"
                    }`}
                  >
                    2. Penanganan PIC
                  </div>
                  <div
                    className={`p-2 rounded-lg border ${
                      selectedComplaint.status === ComplaintStatus.MENUNGGU_VERIFIKASI ||
                      selectedComplaint.status === ComplaintStatus.TERVERIFIKASI
                        ? "bg-purple-100 text-purple-900 border-purple-300"
                        : "bg-slate-100 text-slate-400 border-slate-200"
                    }`}
                  >
                    3. Verifikasi
                  </div>
                  <div
                    className={`p-2 rounded-lg border ${
                      selectedComplaint.status === ComplaintStatus.TERVERIFIKASI
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                        : "bg-slate-100 text-slate-400 border-slate-200"
                    }`}
                  >
                    4. Terverifikasi
                  </div>
                </div>
              </div>

              {/* 1. INFORMASI / FORMULIR DATA KELUHAN (ROLE-BASED) */}
              {currentUser.role === Role.ADMIN ? (
                /* FORM EDIT ADMIN: Data Pokok & Penugasan PIC */
                <div className="space-y-4 p-5 bg-blue-50/40 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>✏️</span> Edit Data Registrasi & Penugasan PIC
                    </h4>
                    <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                      Kewenangan Admin
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Nama Pelapor / Pengguna
                      </label>
                      <input
                        type="text"
                        value={editCustomerName}
                        onChange={(e) => setEditCustomerName(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Sumber Keluhan
                      </label>
                      <select
                        value={editSource}
                        onChange={(e) => setEditSource(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="Telepon">Telepon</option>
                        <option value="Email">Email</option>
                        <option value="Laporan Langsung">Laporan Langsung</option>
                        <option value="Nota Dinas">Nota Dinas</option>
                        <option value="Helpdesk Internal">Helpdesk Internal</option>
                        <option value="Survey Pelanggan">Survey Pelanggan</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Tanggal Pelaporan
                      </label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Petugas PIC Penanggung Jawab
                      </label>
                      <select
                        value={editPicId}
                        onChange={(e) => setEditPicId(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">-- Belum Ditugaskan --</option>
                        {picList.map((pic) => (
                          <option key={pic.id} value={pic.id}>
                            {pic.name} ({pic.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Deskripsi Keluhan Masuk
                    </label>
                    <textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-slate-500">
                      Status Saat Ini: <b>{selectedComplaint.status}</b>
                    </div>
                    <button
                      type="button"
                      disabled={actionLoading || isPending}
                      onClick={handleSaveComplaintDetails}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition cursor-pointer shadow-xs"
                    >
                      {actionLoading ? "Menyimpan..." : "Simpan Perubahan Data Keluhan & PIC"}
                    </button>
                  </div>
                </div>
              ) : (
                /* READ-ONLY UNTUK PIC & VERIFIKATOR */
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <span className="font-bold text-slate-900 text-sm">{selectedComplaint.customerName}</span>
                      <span className="text-slate-500">{selectedComplaint.source} &bull; {formatDate(selectedComplaint.date)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Deskripsi Masalah / Keluhan:
                      </span>
                      <p className="text-slate-800 whitespace-pre-wrap">{selectedComplaint.description}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Alert Khusus Jika Pernah Ditolak / Butuh Revisi */}
              {selectedComplaint.verifications &&
                selectedComplaint.verifications.length > 0 &&
                selectedComplaint.verifications[0].result === VerificationResult.REJECTED && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <span>⚠️</span> Catatan Penolakan / Revisi dari Verifikator:
                    </span>
                    <p className="text-xs text-rose-800 italic">
                      &ldquo;{selectedComplaint.verifications[0].feedback}&rdquo;
                    </p>
                    <p className="text-[10px] text-rose-500">
                      Oleh: {selectedComplaint.verifications[0].verifier.name} &bull;{" "}
                      {formatDate(selectedComplaint.verifications[0].verifiedAt)}
                    </p>
                  </div>
                )}

              {/* 2. TINDAKAN PENANGANAN: KHUSUS ROLE PIC (FORM AKTIF) */}
              {currentUser.role === Role.PIC && (
                <div className="space-y-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Formulir Tindakan Penanganan Pelaksana (PIC)
                    </h4>
                    <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                      Role PIC
                    </span>
                  </div>

                  {/* Input Tindakan Perbaikan */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Tindakan Perbaikan (Corrective Action) <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">Solusi langsung mengatasi masalah</span>
                    </div>
                    <textarea
                      required
                      rows={3}
                      placeholder="Uraikan tindakan teknis langsung yang dilakukan untuk menyelesaikan keluhan..."
                      value={editCorrectiveAction}
                      onChange={(e) => setEditCorrectiveAction(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none bg-white"
                    />
                  </div>

                  {/* Input Tindakan Pencegahan */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Tindakan Pencegahan (Preventive Action) <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">Langkah agar tidak terulang</span>
                    </div>
                    <textarea
                      required
                      rows={3}
                      placeholder="Uraikan tindakan pencegahan sistemik/operasional agar kendala serupa tidak terjadi lagi..."
                      value={editPreventiveAction}
                      onChange={(e) => setEditPreventiveAction(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none bg-white"
                    />
                  </div>

                  {/* Keterangan */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Keterangan Tambahan / Catatan Kendala <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Catatan pelaksanaan atau estimasi waktu..."
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                    />
                  </div>

                  {/* Helper Alert jika belum lengkap */}
                  {(!editCorrectiveAction.trim() || !editPreventiveAction.trim()) && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                      <svg className="w-4 h-4 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Tindakan perbaikan & pencegahan wajib diisi sebelum diajukan untuk verifikasi.</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      disabled={actionLoading || isPending || !editCorrectiveAction.trim()}
                      onClick={() => handleUpdateProgress(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? "Menyimpan..." : "Simpan Draf Tindakan"}
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading || isPending || !editCorrectiveAction.trim() || !editPreventiveAction.trim()}
                      onClick={() => handleUpdateProgress(true)}
                      className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? "Memproses..." : "Submit untuk Verifikasi →"}
                    </button>
                  </div>
                </div>
              )}

              {/* 3. TINDAKAN PENANGANAN: KHUSUS NON-PIC (ADMIN & VERIFIKATOR - READ ONLY / PANTAUAN) */}
              {currentUser.role !== Role.PIC && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Status Tindakan Penanganan PIC
                    </h4>
                    <span className="text-[10px] text-slate-500 italic bg-slate-100 px-2 py-0.5 rounded">
                      Khusus diisi & diajukan oleh Petugas PIC
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Tindakan Perbaikan (Corrective Action)
                      </span>
                      <p className="text-xs text-slate-800 mt-1 whitespace-pre-wrap">
                        {selectedComplaint.correctiveAction || (
                          <span className="text-slate-400 italic">Belum ada tindakan perbaikan yang dicatat oleh PIC.</span>
                        )}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Tindakan Pencegahan (Preventive Action)
                      </span>
                      <p className="text-xs text-slate-800 mt-1 whitespace-pre-wrap">
                        {selectedComplaint.preventiveAction || (
                          <span className="text-slate-400 italic">Belum ada tindakan pencegahan yang dicatat oleh PIC.</span>
                        )}
                      </p>
                    </div>

                    {selectedComplaint.notes && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Catatan Pelaksanaan
                        </span>
                        <p className="text-xs text-slate-800 mt-1">
                          {selectedComplaint.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PANEL KHUSUS VERIFIKATOR (APPROVE / REJECT) */}
              {currentUser.role === Role.VERIFIKATOR && (
                <div className="space-y-3 pt-4 border-t border-purple-100 bg-purple-50/50 p-4 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🛡️</span> Panel Keputusan Verifikasi Mutu
                    </h4>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                      Role Verifikator
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Catatan / Alasan (Wajib diisi jika menolak/reject keluhan)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Solusi belum tuntas diuji / Penjelasan perbaikan diterima..."
                      value={verificationFeedback}
                      onChange={(e) => setVerificationFeedback(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={verifyLoading || isPending}
                      onClick={() => handleVerify(VerificationResult.REJECTED)}
                      className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
                    >
                      Tolak (Perlu Perbaikan)
                    </button>
                    <button
                      type="button"
                      disabled={verifyLoading || isPending}
                      onClick={() => handleVerify(VerificationResult.APPROVED)}
                      className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md cursor-pointer"
                    >
                      Setujui & Verifikasi (Selesai)
                    </button>
                  </div>
                </div>
              )}

              {/* Histori Verifikasi Lengkap */}
              {selectedComplaint.verifications && selectedComplaint.verifications.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Histori Riwayat Verifikasi
                  </h4>
                  <div className="space-y-2">
                    {selectedComplaint.verifications.map((v) => (
                      <div
                        key={v.id}
                        className={`p-3 rounded-xl border text-xs ${
                          v.result === VerificationResult.APPROVED
                            ? "bg-emerald-50/50 border-emerald-200"
                            : "bg-rose-50/50 border-rose-200"
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span
                            className={
                              v.result === VerificationResult.APPROVED
                                ? "text-emerald-800"
                                : "text-rose-800"
                            }
                          >
                            {v.result === VerificationResult.APPROVED ? "Disetujui" : "Ditolak"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(v.verifiedAt)}
                          </span>
                        </div>
                        {v.feedback && (
                          <p className="mt-1 text-slate-600 italic">&ldquo;{v.feedback}&rdquo;</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                          Verifikator: {v.verifier.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL: LIHAT DETAIL KELUHAN (READ-ONLY - TOMBOL MATA) */}
      {/* ======================================================== */}
      {selectedViewComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Image
                  src="/kai-logo.png"
                  alt="KAI Logo"
                  width={64}
                  height={22}
                  className="h-6 w-auto bg-white p-1 rounded object-contain"
                  unoptimized
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-blue-600 px-2.5 py-0.5 rounded text-white tracking-wide">
                      {selectedViewComplaint.complaintNumber}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(selectedViewComplaint.date)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold mt-1 text-slate-100">
                    Detail Keluhan &ndash; {selectedViewComplaint.customerName}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedViewComplaint(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition text-lg"
              >
                &times;
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Status & Channel Banner */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Status Keluhan:</span>
                  {renderStatusBadge(selectedViewComplaint.status, selectedViewComplaint.verifications)}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Saluran:</span>
                  <span className="font-semibold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {selectedViewComplaint.source}
                  </span>
                </div>
              </div>

              {/* Pelapor & PIC Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nama Pelapor / Pengguna
                  </span>
                  <p className="text-sm font-bold text-slate-900">{selectedViewComplaint.customerName}</p>
                  <p className="text-xs text-slate-500">
                    Tanggal: {formatDate(selectedViewComplaint.date)}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Petugas PIC Penanggung Jawab
                  </span>
                  {selectedViewComplaint.pic ? (
                    <div>
                      <p className="text-sm font-bold text-slate-900">{selectedViewComplaint.pic.name}</p>
                      <p className="text-xs text-slate-500">
                        {selectedViewComplaint.pic.email} &bull; ({selectedViewComplaint.pic.role})
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-amber-700 italic bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 inline-block">
                      Belum ditugaskan PIC
                    </p>
                  )}
                </div>
              </div>

              {/* Deskripsi Masalah */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Uraian Lengkap Masalah / Keluhan
                </span>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedViewComplaint.description}
                </div>
              </div>

              {/* Tindakan Penanganan PIC */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Tindakan Penanganan Pelaksana (PIC)
                </span>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                    <span className="text-[11px] font-bold text-slate-700">
                      Tindakan Perbaikan (Corrective Action):
                    </span>
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {selectedViewComplaint.correctiveAction || (
                        <span className="text-slate-400 italic">Belum ada tindakan perbaikan yang dicatat.</span>
                      )}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                    <span className="text-[11px] font-bold text-slate-700">
                      Tindakan Pencegahan (Preventive Action):
                    </span>
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {selectedViewComplaint.preventiveAction || (
                        <span className="text-slate-400 italic">Belum ada tindakan pencegahan yang dicatat.</span>
                      )}
                    </p>
                  </div>

                  {selectedViewComplaint.notes && (
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                      <span className="text-[11px] font-bold text-slate-700">
                        Catatan Tambahan:
                      </span>
                      <p className="text-xs text-slate-800 leading-relaxed">
                        {selectedViewComplaint.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Histori Riwayat Verifikasi */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Riwayat Verifikasi Mutu Kendali
                </span>
                {selectedViewComplaint.verifications && selectedViewComplaint.verifications.length > 0 ? (
                  <div className="space-y-2">
                    {selectedViewComplaint.verifications.map((v) => (
                      <div
                        key={v.id}
                        className={`p-3 rounded-xl border text-xs ${
                          v.result === VerificationResult.APPROVED
                            ? "bg-emerald-50/60 border-emerald-200"
                            : "bg-rose-50/60 border-rose-200"
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span
                            className={
                              v.result === VerificationResult.APPROVED
                                ? "text-emerald-800"
                                : "text-rose-800"
                            }
                          >
                            {v.result === VerificationResult.APPROVED ? "Disetujui (Approved)" : "Ditolak (Rejected)"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(v.verifiedAt)}
                          </span>
                        </div>
                        {v.feedback && (
                          <p className="mt-1 text-slate-600 italic">&ldquo;{v.feedback}&rdquo;</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                          Verifikator: {v.verifier.name} ({v.verifier.role})
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400 italic">
                    Belum ada riwayat verifikasi mutu untuk keluhan ini.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  const comp = selectedViewComplaint;
                  setSelectedViewComplaint(null);
                  handleOpenDetail(comp);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Buka Mode Edit</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedViewComplaint(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL: KONFIRMASI HAPUS KELUHAN (KHUSUS ADMIN) */}
      {/* ======================================================== */}
      {complaintToDelete && currentUser.role === Role.ADMIN && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-2xs">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hapus Keluhan Pelanggan?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tindakan ini permanen. Seluruh riwayat penanganan dan verifikasi terkait akan ikut terhapus dari sistem.
                </p>
              </div>

              {/* Card Ringkasan Keluhan */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-900">
                    {complaintToDelete.complaintNumber}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatDate(complaintToDelete.date)}
                  </span>
                </div>
                <p className="font-semibold text-slate-800">
                  {complaintToDelete.customerName}
                </p>
                <p className="text-[11px] text-slate-500 line-clamp-2">
                  {complaintToDelete.description}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleteLoading || isPending}
                onClick={() => setComplaintToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteLoading || isPending}
                onClick={handleDeleteComplaint}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {deleteLoading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Hapus Keluhan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL: DOKUMEN CETAK KAI FR.SM/TI/033.001 */}
      {/* ======================================================== */}
      {isDocModalOpen && (
        <KaiDocumentModal
          complaints={complaints}
          currentUser={currentUser}
          onClose={() => setIsDocModalOpen(false)}
        />
      )}
    </div>
  );
}
