"use client";
import React, { useState, useTransition } from "react";
import { ComplaintStatus, Role, VerificationResult, ComplaintData, UserSummary } from "@/types/database";
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
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { exportComplaintsToExcel } from "@/lib/exportExcel";

export type { ComplaintData, UserSummary } from "@/types/database";

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
  const [picOnlyFilter, setPicOnlyFilter] = useState(false);
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

  // Kunci scroll dashboard saat modal apapun terbuka agar modal dapat di-scroll dengan sempurna
  React.useEffect(() => {
    const isAnyModalOpen =
      isCreateModalOpen ||
      isDocModalOpen ||
      Boolean(selectedComplaint) ||
      Boolean(selectedViewComplaint) ||
      Boolean(complaintToDelete);

    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [
    isCreateModalOpen,
    isDocModalOpen,
    selectedComplaint,
    selectedViewComplaint,
    complaintToDelete,
  ]);

  // Form State: Catat Keluhan Baru
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerContact, setNewCustomerContact] = useState("");
  const [newDaopOrStation, setNewDaopOrStation] = useState("Daop 1 Jakarta");
  const [newSource, setNewSource] = useState("Telepon");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newPicId, setNewPicId] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Form State: Tindak Lanjut PIC / Admin
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerContact, setEditCustomerContact] = useState("");
  const [editDaopOrStation, setEditDaopOrStation] = useState("");
  const [editSource, setEditSource] = useState("Telepon");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPicId, setEditPicId] = useState<string>("");
  const [editCorrectiveAction, setEditCorrectiveAction] = useState("");
  const [editPreventiveAction, setEditPreventiveAction] = useState("");
  const [editProofImageUrl, setEditProofImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Form State: Verifikasi
  const [verificationFeedback, setVerificationFeedback] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Mobile sidebar toggle
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Upload handler for proof image to Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Ukuran foto bukti maksimal 5MB.", "error");
      return;
    }

    setUploadingImage(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `proof_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `complaints/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("complaint-proofs")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("complaint-proofs")
        .getPublicUrl(filePath);

      setEditProofImageUrl(publicUrl);
      showToast("Foto bukti berhasil diunggah ke Supabase!");
    } catch (err: any) {
      console.error("Gagal upload foto:", err);
      showToast(err.message || "Gagal mengunggah foto ke Supabase Storage.", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  // Sync selected complaint when opened
  const handleOpenDetail = (complaint: ComplaintData) => {
    setSelectedComplaint(complaint);
    setEditCustomerName(complaint.customerName || "");
    setEditCustomerContact(complaint.customerContact || "");
    setEditDaopOrStation(complaint.daopOrStation || "");
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
    setEditProofImageUrl(complaint.proofImageUrl || null);
    setEditNotes(complaint.notes || "");
    setVerificationFeedback("");
  };

  // 1. Submit: Catat Keluhan Baru
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedCustomer = newCustomerName.trim();
    const trimmedDescription = newDescription.trim();

    if (!trimmedCustomer) {
      showToast("Nama pelapor wajib diisi.", "error");
      return;
    }

    if (!trimmedDescription) {
      showToast("Uraian lengkap keluhan wajib diisi sebelum menyimpan data.", "error");
      return;
    }

    setCreateLoading(true);
    startTransition(async () => {
      const res = await createComplaint({
        customerName: trimmedCustomer,
        customerContact: newCustomerContact.trim() || undefined,
        daopOrStation: newDaopOrStation,
        source: newSource,
        date: newDate,
        picId: newPicId || null,
        description: trimmedDescription,
      });

      setCreateLoading(false);
      if (res.success) {
        showToast(`Keluhan baru ${res.data?.complaintNumber} berhasil dicatat!`);
        setIsCreateModalOpen(false);
        setNewCustomerName("");
        setNewCustomerContact("");
        setNewDaopOrStation("Daop 1 Jakarta");
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

    // Validasi submit verifikasi: Wajib diisi perbaikan, pencegahan, dan foto bukti
    if (submitForVerification) {
      if (!corrective || !preventive) {
        showToast("Tindakan perbaikan dan tindakan pencegahan wajib diisi sebelum diajukan untuk verifikasi.", "error");
        return;
      }
      if (!editProofImageUrl) {
        showToast("Petugas wajib mengunggah foto bukti hasil perbaikan ke Supabase sebelum mengajukan verifikasi.", "error");
        return;
      }
    }

    setActionLoading(true);
    startTransition(async () => {
      const res = await updateComplaintProgress(selectedComplaint.id, {
        correctiveAction: corrective,
        preventiveAction: preventive,
        notes: editNotes.trim(),
        proofImageUrl: editProofImageUrl,
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

    if (!editCustomerName.trim()) {
      showToast("Nama pelapor wajib diisi.", "error");
      return;
    }

    if (!editDescription.trim()) {
      showToast("Uraian lengkap keluhan wajib diisi sebelum menyimpan perubahan.", "error");
      return;
    }

    setActionLoading(true);
    startTransition(async () => {
      const res = await editComplaintDetails(selectedComplaint.id, {
        customerName: editCustomerName,
        customerContact: editCustomerContact,
        daopOrStation: editDaopOrStation,
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

  // SLA Badge Component (Target Waktu Penanganan KAI: 24 Jam)
  const renderSlaBadge = (item: ComplaintData) => {
    const startTime = new Date(item.date).getTime();
    const isCompleted = item.status === ComplaintStatus.TERVERIFIKASI;
    const isSubmitted = !!item.submittedAt || item.status === ComplaintStatus.MENUNGGU_VERIFIKASI;

    if (isCompleted || isSubmitted) {
      const endTime = item.submittedAt
        ? new Date(item.submittedAt).getTime()
        : new Date(item.createdAt).getTime();
      const elapsedHours = Math.max(0, Math.round((endTime - startTime) / 3600000));

      if (elapsedHours <= 24) {
        return (
          <span
            title={`Keluhan diajukan/diselesaikan dalam ${elapsedHours} jam sejak diterima (SLA Terpenuhi)`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
          >
            <span>✓</span> SLA OK ({elapsedHours}j)
          </span>
        );
      } else {
        const overHours = elapsedHours - 24;
        return (
          <span
            title={`Penyelesaian membutuhkan ${elapsedHours} jam (Melewati batas SLA 24 jam)`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
          >
            <span>⚠️</span> Lewat SLA (+{overHours}j)
          </span>
        );
      }
    }

    // Keluhan Masih Aktif (BELUM_DITANGANI / DALAM_PENANGANAN)
    const elapsedNowHours = (Date.now() - startTime) / 3600000;
    const remainingHours = Math.round(24 - elapsedNowHours);

    if (remainingHours <= 0) {
      return (
        <span
          title={`Telah melampaui batas waktu penanganan 24 jam (+${Math.abs(remainingHours)} jam)`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
        >
          <span>🚨</span> Overdue (+{Math.abs(remainingHours)}j)
        </span>
      );
    } else if (remainingHours <= 6) {
      return (
        <span
          title={`Mendekati batas waktu SLA 24 jam (Sisa ${remainingHours} jam)`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300"
        >
          <span>⏱️</span> Sisa {remainingHours}j
        </span>
      );
    } else {
      return (
        <span
          title={`Target SLA: 24 jam. Sisa waktu penanganan: ${remainingHours} jam`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
        >
          <span>⏱️</span> Sisa {remainingHours}j
        </span>
      );
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

            <button
              onClick={() => {
                exportComplaintsToExcel(filteredComplaints);
                showToast("Rekapitulasi keluhan berhasil diekspor ke Excel (.xlsx)!");
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Ekspor Rekap Excel</span>
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
                {/* Ekspor Excel Button */}
                <button
                  onClick={() => {
                    exportComplaintsToExcel(filteredComplaints);
                    showToast("Rekapitulasi keluhan berhasil diekspor ke Excel (.xlsx)!");
                  }}
                  title="Unduh rekapitulasi keluhan yang sedang difilter ke format spreadsheet Excel (.xlsx)"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer shadow-2xs active:scale-95"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Ekspor Excel (.xlsx)</span>
                </button>

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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 text-xs truncate" title={item.customerName}>
                              {item.customerName}
                            </span>
                            {item.daopOrStation && (
                              <span className="text-[9px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 truncate max-w-[150px]">
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

                        {/* 4. Status & SLA */}
                        <td className="px-3 py-3.5">
                          <div className="flex flex-col items-start gap-1">
                            {renderStatusBadge(item.status, item.verifications)}
                            <div>{renderSlaBadge(item)}</div>
                          </div>
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
                              title={
                                currentUser.role === Role.PIC
                                  ? item.picId === currentUser.id
                                    ? "Eksekusi Keluhan (Tugas Anda)"
                                    : "Pantau Penanganan (Ditugaskan ke PIC Lain)"
                                  : currentUser.role === Role.ADMIN
                                  ? "Edit Data Keluhan & Penugasan PIC"
                                  : "Verifikasi Mutu Keluhan"
                              }
                              aria-label="Edit / Tindak Lanjut Keluhan"
                              className={`p-1.5 rounded-lg border transition cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
                                currentUser.role === Role.PIC && item.picId === currentUser.id
                                  ? "text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border-blue-200"
                                  : "text-slate-500 hover:text-amber-700 bg-slate-100/80 hover:bg-amber-50 border-slate-200/60 hover:border-amber-200"
                              }`}
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="max-w-xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header Tetap / Pinned Header */}
            <div className="p-5 sm:p-6 bg-blue-900 text-white flex items-center justify-between shrink-0 shadow-xs">
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
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Form dengan Konten Scrollable & Footer Tetap */}
            <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nama Personil / Pelapor <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Hendra (Divisi Logistik)"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Kontak Pelapor / WhatsApp <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 0812-3456-7890"
                      value={newCustomerContact}
                      onChange={(e) => setNewCustomerContact(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Wilayah Operasional / Daop
                    </label>
                    <select
                      value={newDaopOrStation}
                      onChange={(e) => setNewDaopOrStation(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 bg-white"
                    >
                      <option value="Kantor Pusat KAI Bandung">Kantor Pusat KAI Bandung</option>
                      <option value="Daop 1 Jakarta">Daop 1 Jakarta (Gambir / Pasarsenen)</option>
                      <option value="Daop 2 Bandung">Daop 2 Bandung</option>
                      <option value="Daop 3 Cirebon">Daop 3 Cirebon</option>
                      <option value="Daop 4 Semarang">Daop 4 Semarang</option>
                      <option value="Daop 5 Purwokerto">Daop 5 Purwokerto</option>
                      <option value="Daop 6 Yogyakarta">Daop 6 Yogyakarta (Tugu / Lempuyangan)</option>
                      <option value="Daop 7 Madiun">Daop 7 Madiun</option>
                      <option value="Daop 8 Surabaya">Daop 8 Surabaya (Gubeng / Pasar Turi)</option>
                      <option value="Daop 9 Jember">Daop 9 Jember</option>
                      <option value="Divre I Sumatera Utara">Divre I Sumatera Utara</option>
                      <option value="Divre II Sumatera Barat">Divre II Sumatera Barat</option>
                      <option value="Divre III Palembang">Divre III Palembang</option>
                      <option value="Divre IV Tanjungkarang">Divre IV Tanjungkarang</option>
                      <option value="Lainnya">Lainnya / Luar Wilayah</option>
                    </select>
                  </div>

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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Uraian Lengkap Keluhan / Masalah <span className="text-rose-500 font-bold">* (Wajib Diisi)</span>
                    </label>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        newDescription.trim().length === 0
                          ? "bg-rose-50 text-rose-600 border border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {newDescription.trim().length === 0
                        ? "Wajib Diisi"
                        : `${newDescription.trim().length} karakter`}
                    </span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    placeholder="Tuliskan secara lengkap rincian kendala atau keluhan pelanggan yang perlu ditindaklanjuti (wajib diisi)..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 text-slate-900 resize-none transition ${
                      newDescription.trim() === ""
                        ? "border-amber-300 focus:ring-amber-500 bg-amber-50/20"
                        : "border-slate-300 focus:ring-blue-600 bg-white"
                    }`}
                  />
                  {newDescription.trim() === "" && (
                    <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1 font-medium">
                      <span>⚠️</span> Form tidak dapat disimpan jika uraian keluhan masih kosong.
                    </p>
                  )}
                </div>
              </div>

              {/* Footer Aksi Tetap / Pinned Footer */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Pastikan nama pelapor dan uraian masalah terisi lengkap.
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading || isPending || !newDescription.trim() || !newCustomerName.trim()}
                    className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                    title={
                      !newDescription.trim()
                        ? "Uraian keluhan wajib diisi untuk menyimpan"
                        : "Simpan keluhan ke sistem"
                    }
                  >
                    {createLoading ? "Menyimpan Data..." : "Simpan Keluhan"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL: DETAIL & TINDAK LANJUT KELUHAN (ROLE-BASED) */}
      {/* ======================================================== */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
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
                        Kontak Pelapor / WhatsApp <span className="text-slate-400 font-normal">(Opsional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 0812-3456-7890"
                        value={editCustomerContact}
                        onChange={(e) => setEditCustomerContact(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Wilayah Operasional / Daop
                      </label>
                      <select
                        value={editDaopOrStation}
                        onChange={(e) => setEditDaopOrStation(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">-- Pilih Wilayah / Daop --</option>
                        <option value="Kantor Pusat KAI Bandung">Kantor Pusat KAI Bandung</option>
                        <option value="Daop 1 Jakarta">Daop 1 Jakarta (Gambir / Pasarsenen)</option>
                        <option value="Daop 2 Bandung">Daop 2 Bandung</option>
                        <option value="Daop 3 Cirebon">Daop 3 Cirebon</option>
                        <option value="Daop 4 Semarang">Daop 4 Semarang</option>
                        <option value="Daop 5 Purwokerto">Daop 5 Purwokerto</option>
                        <option value="Daop 6 Yogyakarta">Daop 6 Yogyakarta (Tugu / Lempuyangan)</option>
                        <option value="Daop 7 Madiun">Daop 7 Madiun</option>
                        <option value="Daop 8 Surabaya">Daop 8 Surabaya (Gubeng / Pasar Turi)</option>
                        <option value="Daop 9 Jember">Daop 9 Jember</option>
                        <option value="Divre I Sumatera Utara">Divre I Sumatera Utara</option>
                        <option value="Divre II Sumatera Barat">Divre II Sumatera Barat</option>
                        <option value="Divre III Palembang">Divre III Palembang</option>
                        <option value="Divre IV Tanjungkarang">Divre IV Tanjungkarang</option>
                        <option value="Lainnya">Lainnya / Luar Wilayah</option>
                      </select>
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
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 flex-wrap gap-2">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{selectedComplaint.customerName}</span>
                        {selectedComplaint.customerContact && (
                          <span className="text-[11px] text-slate-500 ml-2 font-mono">
                            ({selectedComplaint.customerContact})
                          </span>
                        )}
                        {selectedComplaint.daopOrStation && (
                          <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 ml-2 font-medium">
                            {selectedComplaint.daopOrStation}
                          </span>
                        )}
                      </div>
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

              {/* 2. TINDAKAN PENANGANAN: KHUSUS ROLE PIC */}
              {currentUser.role === Role.PIC && (
                <div className="space-y-4 pt-3 border-t border-slate-100">
                  {selectedComplaint.picId === currentUser.id ? (
                    /* JIKA KELUHAN INI DITUGASKAN KEPADA PIC INI (FORM EKSEKUSI AKTIF) */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Formulir Eksekusi Penanganan (PIC)
                          </h4>
                          <p className="text-[11px] text-emerald-700 font-medium">
                            ✓ Keluhan ini ditugaskan kepada Anda oleh Admin.
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                          Tugas Anda
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

                      {/* Unggah Foto Bukti Hasil Perbaikan (Supabase Storage) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-slate-700">
                            Unggah Foto Bukti Hasil Perbaikan <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <span className="text-[10px] text-slate-400">Supabase Storage &bull; Maks 5MB</span>
                        </div>

                        {editProofImageUrl ? (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Foto Bukti Siap Diverifikasi
                              </span>
                              <div className="flex items-center gap-3">
                                <a
                                  href={editProofImageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1"
                                >
                                  <span>Lihat Foto</span>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setEditProofImageUrl(null)}
                                  className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                                >
                                  Ganti Foto
                                </button>
                              </div>
                            </div>
                            <div className="relative w-full max-h-48 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={editProofImageUrl}
                                alt="Foto Bukti Perbaikan"
                                className="w-full max-h-48 object-contain"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-4 text-center bg-slate-50/50 hover:bg-blue-50/30 transition">
                            <input
                              type="file"
                              id="proof-upload-input"
                              accept="image/png,image/jpeg,image/webp"
                              disabled={uploadingImage}
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                            <label htmlFor="proof-upload-input" className="cursor-pointer block">
                              <svg className="w-7 h-7 mx-auto text-slate-400 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs font-semibold text-blue-900 block">
                                {uploadingImage ? "Sedang Mengunggah ke Supabase..." : "Pilih / Ambil Foto Bukti Perbaikan"}
                              </span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                Format: PNG, JPG, atau WEBP (Maksimal 5MB)
                              </span>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Keterangan Tambahan */}
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
                      {(!editCorrectiveAction.trim() || !editPreventiveAction.trim() || !editProofImageUrl) && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                          <svg className="w-4 h-4 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>
                            Tindakan perbaikan, tindakan pencegahan, dan <b>foto bukti perbaikan</b> wajib diisi sebelum diajukan ke Verifikator.
                          </span>
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
                          disabled={actionLoading || isPending || !editCorrectiveAction.trim() || !editPreventiveAction.trim() || !editProofImageUrl}
                          onClick={() => handleUpdateProgress(true)}
                          className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {actionLoading ? "Memproses..." : "Submit untuk Verifikasi →"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* JIKA KELUHAN BUKAN DITUGASKAN KEPADA PIC INI (PANTAUAN READ-ONLY) */
                    <div className="space-y-3">
                      <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl space-y-1">
                        <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                          <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Status Penugasan PIC: {selectedComplaint.pic ? selectedComplaint.pic.name : "Belum Ditugaskan"}</span>
                        </div>
                        <p className="text-xs text-amber-800 leading-relaxed">
                          Anda berwenang memantau seluruh keluhan sistem. Namun, pengisian tindakan perbaikan dan unggah foto bukti hanya dapat dilakukan oleh PIC yang ditugaskan resmi oleh Admin ({selectedComplaint.pic ? selectedComplaint.pic.name : "menunggu penugasan Admin"}).
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Tindakan Perbaikan (Corrective Action)
                          </span>
                          <p className="text-xs text-slate-800 mt-1 whitespace-pre-wrap">
                            {selectedComplaint.correctiveAction || (
                              <span className="text-slate-400 italic">Belum ada tindakan perbaikan yang dicatat oleh PIC bersangkutan.</span>
                            )}
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Tindakan Pencegahan (Preventive Action)
                          </span>
                          <p className="text-xs text-slate-800 mt-1 whitespace-pre-wrap">
                            {selectedComplaint.preventiveAction || (
                              <span className="text-slate-400 italic">Belum ada tindakan pencegahan yang dicatat.</span>
                            )}
                          </p>
                        </div>

                        {/* Foto Bukti Read-Only */}
                        {selectedComplaint.proofImageUrl ? (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Foto Bukti Hasil Perbaikan (Supabase Storage)
                              </span>
                              <a
                                href={selectedComplaint.proofImageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1"
                              >
                                <span>Lihat Penuh</span>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                            <div className="relative w-full max-h-44 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={selectedComplaint.proofImageUrl}
                                alt="Bukti Perbaikan"
                                className="w-full max-h-44 object-contain"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-400 italic">
                            Belum ada foto bukti hasil perbaikan yang diunggah.
                          </div>
                        )}

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

                    {/* Foto Bukti Hasil Perbaikan (Supabase Storage) */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Foto Bukti Hasil Perbaikan (Supabase Storage)
                        </span>
                        {selectedComplaint.proofImageUrl && (
                          <a
                            href={selectedComplaint.proofImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1"
                          >
                            <span>Lihat Foto Penuh</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                      {selectedComplaint.proofImageUrl ? (
                        <div className="relative w-full max-h-52 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedComplaint.proofImageUrl}
                            alt="Foto Bukti Perbaikan"
                            className="w-full max-h-52 object-contain"
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          Belum ada foto bukti hasil perbaikan yang diunggah oleh PIC.
                        </p>
                      )}
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
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 font-medium">Status:</span>
                  {renderStatusBadge(selectedViewComplaint.status, selectedViewComplaint.verifications)}
                  <span className="text-xs text-slate-300">|</span>
                  <span className="text-xs text-slate-500 font-medium">SLA (Target 24 Jam):</span>
                  {renderSlaBadge(selectedViewComplaint)}
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
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Nama Pelapor / Pengguna
                    </span>
                    {selectedViewComplaint.daopOrStation && (
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {selectedViewComplaint.daopOrStation}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-900">{selectedViewComplaint.customerName}</p>
                  
                  {/* Kontak Pelapor */}
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Nomor Kontak / WhatsApp:</span>
                    {selectedViewComplaint.customerContact ? (
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-mono text-xs text-slate-800 font-semibold">
                          {selectedViewComplaint.customerContact}
                        </span>
                        <a
                          href={`https://wa.me/${selectedViewComplaint.customerContact.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Hubungi pelapor melalui WhatsApp"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 transition"
                        >
                          <span>💬 Chat WA</span>
                        </a>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Kontak tidak dicantumkan</span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 pt-1 border-t border-slate-100">
                    Tanggal Laporan: {formatDate(selectedViewComplaint.date)}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Petugas PIC Penanggung Jawab
                  </span>
                  {selectedViewComplaint.pic ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900">{selectedViewComplaint.pic.name}</p>
                      <p className="text-xs text-slate-500">
                        {selectedViewComplaint.pic.email} &bull; ({selectedViewComplaint.pic.role})
                      </p>
                      {selectedViewComplaint.submittedAt && (
                        <p className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded inline-block font-medium">
                          Diajukan Verifikasi: {formatDate(selectedViewComplaint.submittedAt)}
                        </p>
                      )}
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

                  {/* Foto Bukti Hasil Perbaikan (Supabase Storage) */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">
                        Foto Bukti Hasil Perbaikan (Supabase Storage):
                      </span>
                      {selectedViewComplaint.proofImageUrl && (
                        <a
                          href={selectedViewComplaint.proofImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1"
                        >
                          <span>Buka Ukuran Penuh</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                    {selectedViewComplaint.proofImageUrl ? (
                      <div className="relative w-full max-h-56 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedViewComplaint.proofImageUrl}
                          alt="Foto Bukti Hasil Perbaikan"
                          className="w-full max-h-56 object-contain"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        Belum ada foto bukti hasil perbaikan yang diunggah.
                      </p>
                    )}
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
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
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
