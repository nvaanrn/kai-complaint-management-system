"use client";

import React, { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  ComplaintData,
  UserSummary,
  Role,
  VerificationResult,
} from "@/types/database";
import {
  createComplaint,
  updateComplaintProgress,
  verifyComplaint,
  deleteComplaint,
  editComplaintDetails,
} from "@/app/actions/complaints";
import { exportComplaintsToExcel } from "@/lib/exportExcel";

// Modular Subcomponents
import DashboardSidebar from "./dashboard/DashboardSidebar";
import DashboardHeader from "./dashboard/DashboardHeader";
import AdminOverview from "./dashboard/AdminOverview";
import PicOverview from "./dashboard/PicOverview";
import VerifierOverview from "./dashboard/VerifierOverview";
import ComplaintTable from "./dashboard/ComplaintTable";
import ComplaintDetailModal from "./dashboard/ComplaintDetailModal";
import ComplaintActionModal from "./dashboard/ComplaintActionModal";
import ComplaintCreateModal from "./dashboard/ComplaintCreateModal";
import ComplaintDeleteModal from "./dashboard/ComplaintDeleteModal";
import ToastNotification from "./dashboard/ToastNotification";
import KaiDocumentModal from "./KaiDocumentModal";

export type { ComplaintData, UserSummary } from "@/types/database";

interface DashboardClientProps {
  complaints: ComplaintData[];
  picList: UserSummary[];
  currentUser: UserSummary;
}

export default function DashboardClient({
  complaints,
  picList,
  currentUser,
}: DashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Navigation & View State
  const [activeMenu, setActiveMenu] = useState<
    "overview" | "complaints" | "verifications" | "documents"
  >("overview");

  // Apply URL query param to open verification tab directly
  const searchParams = useSearchParams();
  React.useEffect(() => {
    const menu = searchParams?.get("menu");
    if (menu === "verifications") {
      setActiveMenu("verifications");
    }
  }, [searchParams]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [picOnlyFilter, setPicOnlyFilter] = useState(false);
  const [activeSpecialFilter, setActiveSpecialFilter] = useState<
    "unassigned" | "my_tasks" | "revisions" | null
  >(null);

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintData | null>(null);
  const [selectedViewComplaint, setSelectedViewComplaint] = useState<ComplaintData | null>(null);
  const [complaintToDelete, setComplaintToDelete] = useState<ComplaintData | null>(null);

  // Loading States
  const [createLoading, setCreateLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  // Helper check if complaint is assigned to current user
  const isAssignedToCurrentUser = (item: ComplaintData) => {
    if (!item.pic) return false;
    return (
      item.pic.id === currentUser.id ||
      item.pic.email.toLowerCase() === currentUser.email.toLowerCase()
    );
  };

  // -------------------------------------------------------------
  // Special Quick Filter Handlers (Admin / PIC / Verifier)
  // -------------------------------------------------------------
  const handleFilterUnassigned = () => {
    setActiveSpecialFilter("unassigned");
    setStatusFilter("ALL");
    setSourceFilter("ALL");
    setSearchQuery("");
    setPicOnlyFilter(false);
  };

  const handleFilterMyTasks = () => {
    setActiveSpecialFilter("my_tasks");
    setPicOnlyFilter(true);
    setStatusFilter("ALL");
  };

  const handleFilterRevisions = () => {
    setActiveSpecialFilter("revisions");
    setPicOnlyFilter(true);
    setStatusFilter("DALAM_PENANGANAN");
  };

  const handleResetSpecialFilters = () => {
    setActiveSpecialFilter(null);
    setStatusFilter("ALL");
    setSourceFilter("ALL");
    setPicOnlyFilter(false);
  };

  // Filter complaints based on unassigned special filter
  const displayedComplaints = React.useMemo(() => {
    if (activeSpecialFilter === "unassigned") {
      return complaints.filter((c) => !c.pic && c.status !== "TERVERIFIKASI");
    }
    return complaints;
  }, [complaints, activeSpecialFilter]);

  // -------------------------------------------------------------
  // Server Action Handlers
  // -------------------------------------------------------------
  // 1. Create Complaint (Admin)
  const handleCreateSubmit = async (data: {
    customerName: string;
    customerContact?: string;
    daopOrStation?: string;
    source: string;
    date: string;
    picId?: string;
    description: string;
  }) => {
    try {
      setCreateLoading(true);
      const res = await createComplaint({
        customerName: data.customerName,
        customerContact: data.customerContact,
        daopOrStation: data.daopOrStation,
        source: data.source,
        date: data.date,
        picId: data.picId,
        description: data.description,
      });

      if (!res.success) {
        showToast(res.error || "Gagal mencatat keluhan.", "error");
        return;
      }

      showToast("Keluhan baru berhasil diregistrasi ke sistem SPKP!");
      setIsCreateModalOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      showToast(err.message || "Terjadi kesalahan sistem saat mencatat keluhan.", "error");
    } finally {
      setCreateLoading(false);
    }
  };

  // 2. Save Admin Details & PIC Assignment
  const handleSaveAdminDetails = async (data: {
    customerName: string;
    customerContact?: string;
    daopOrStation?: string;
    source: string;
    date: string;
    description: string;
    picId?: string | null;
  }) => {
    if (!selectedComplaint) return;
    try {
      setActionLoading(true);
      const res = await editComplaintDetails(selectedComplaint.id, data);

      if (!res.success) {
        showToast(res.error || "Gagal memperbarui data keluhan.", "error");
        return;
      }

      showToast("Data keluhan dan penugasan PIC berhasil diperbarui!");
      setSelectedComplaint(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      showToast(err.message || "Terjadi kendala saat memperbarui keluhan.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Update PIC Progress & Submit for Verification
  const handleUpdatePicProgress = async (
    data: {
      correctiveAction: string;
      preventiveAction: string;
      proofImageUrl?: string | null;
      notes?: string;
    },
    submitForVerification: boolean
  ) => {
    if (!selectedComplaint) return;
    try {
      setActionLoading(true);
      const res = await updateComplaintProgress(selectedComplaint.id, {
        correctiveAction: data.correctiveAction,
        preventiveAction: data.preventiveAction,
        proofImageUrl: data.proofImageUrl || undefined,
        notes: data.notes,
        submitForVerification,
      });

      if (!res.success) {
        showToast(res.error || "Gagal menyimpan progres penanganan.", "error");
        return;
      }

      const msg = submitForVerification
        ? "Tindakan penanganan & bukti fisik berhasil diajukan ke Verifikator!"
        : "Draf tindakan perbaikan berhasil disimpan.";
      showToast(msg);
      setSelectedComplaint(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      showToast(err.message || "Terjadi kendala saat memperbarui progres.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Verify Complaint (Verifier)
  const handleVerify = async (result: VerificationResult, feedback: string) => {
    if (!selectedComplaint) return;
    try {
      setActionLoading(true);
      const res = await verifyComplaint(selectedComplaint.id, {
        result,
        feedback,
      });

      if (!res.success) {
        showToast(res.error || "Gagal memproses verifikasi.", "error");
        return;
      }

      const msg =
        result === VerificationResult.APPROVED
          ? "Keluhan telah disetujui & berstatus Terverifikasi!"
          : "Keluhan ditolak dan dikembalikan ke PIC untuk perbaikan.";
      showToast(msg);
      setSelectedComplaint(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      showToast(err.message || "Terjadi kesalahan saat memproses verifikasi.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Delete Complaint (Admin)
  const handleDeleteComplaint = async () => {
    if (!complaintToDelete) return;
    try {
      setDeleteLoading(true);
      const res = await deleteComplaint(complaintToDelete.id);

      if (!res.success) {
        showToast(res.error || "Gagal menghapus keluhan.", "error");
        return;
      }

      showToast("Keluhan berhasil dihapus permanen dari sistem.");
      setComplaintToDelete(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      showToast(err.message || "Terjadi kesalahan saat menghapus keluhan.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Counters
  const countVerif = complaints.filter((c) => c.status === "MENUNGGU_VERIFIKASI").length;
  const countMyTasks = complaints.filter(isAssignedToCurrentUser).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 print:bg-white print:min-h-0 print:block print:p-0 print:m-0">
      {/* 1. Sidebar Navigasi */}
      <DashboardSidebar
        currentUser={currentUser}
        activeMenu={activeMenu}
        setActiveMenu={(m) => {
          setActiveMenu(m);
          if (m === "verifications") {
            if (currentUser.role === Role.ADMIN) {
              setStatusFilter("TERVERIFIKASI");
            } else {
              setStatusFilter("MENUNGGU_VERIFIKASI");
            }
          } else {
            setStatusFilter("ALL");
          }
        }}
        totalComplaints={complaints.length}
        pendingVerifications={countVerif}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenDocModal={() => setIsDocModalOpen(true)}
        onResetSpecialFilters={handleResetSpecialFilters}
      />

      {/* 2. Main Content Area (Disembunyikan saat mencetak agar hanya modal dokumen KAI yang dicetak) */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 print:hidden">
        {/* Header */}
        <DashboardHeader
          currentUser={currentUser}
          searchQuery={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />

        {/* Main Body */}
        <main className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Hero Welcome Greeting */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-sm relative overflow-hidden">
            <div className="relative z-10 space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-blue-200 border border-white/10">
                PT Kereta Api Indonesia (Persero) &bull; Pengendalian Mutu
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Selamat Datang, {currentUser.name || "Petugas SPKP"} 👋
              </h1>
              <p className="text-xs sm:text-sm text-blue-100/80 max-w-2xl leading-relaxed">
                {currentUser.role === Role.ADMIN &&
                  "Anda memiliki kewenangan penuh mencatat keluhan, menentukan PIC, serta mengelola dokumen kendali mutu FR.SM/TI/033.001."}
                {currentUser.role === Role.PIC &&
                  `Terdapat ${countMyTasks} tiket keluhan yang ditugaskan ke Anda. Segera lakukan tindakan perbaikan, lampirkan bukti fisik, dan ajukan verifikasi.`}
                {currentUser.role === Role.VERIFIKATOR &&
                  `Terdapat ${countVerif} tiket keluhan menunggu verifikasi. Validasi tindakan perbaikan dan foto bukti fisik dari PIC.`}
              </p>
            </div>
          </div>

          {/* Special Filter Banner jika sedang aktif */}
          {activeSpecialFilter && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <span>🔍</span>
                <span>
                  Filter Khusus Aktif:{" "}
                  <b>
                    {activeSpecialFilter === "unassigned" && "Keluhan Belum Ditugaskan"}
                    {activeSpecialFilter === "my_tasks" && "Tugas Aktif Saya"}
                    {activeSpecialFilter === "revisions" && "Keluhan Memerlukan Revisi PIC"}
                  </b>
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetSpecialFilters}
                className="px-2.5 py-1 bg-white border border-blue-300 rounded-lg text-[11px] font-semibold text-blue-800 hover:bg-blue-100 transition cursor-pointer"
              >
                Hapus Filter Khusus
              </button>
            </div>
          )}

          {/* Role-Based Overview (Ketika di tab Overview) */}
          {activeMenu === "overview" && (
            <>
              {currentUser.role === Role.ADMIN && (
                <AdminOverview
                  complaints={complaints}
                  statusFilter={statusFilter}
                  sourceFilter={sourceFilter}
                  onSelectStatusFilter={(status) => {
                    setActiveSpecialFilter(null);
                    setStatusFilter(status);
                  }}
                  onSelectSourceFilter={(source) => setSourceFilter(source)}
                  onFilterUnassigned={handleFilterUnassigned}
                  activeSpecialFilter={
                    activeSpecialFilter === "unassigned" ? "unassigned" : null
                  }
                />
              )}

              {currentUser.role === Role.PIC && (
                <PicOverview
                  complaints={complaints}
                  currentUser={currentUser}
                  onFilterMyTasks={handleFilterMyTasks}
                  onFilterRevisions={handleFilterRevisions}
                  onSelectStatusFilter={(status) => {
                    setActiveSpecialFilter(null);
                    setStatusFilter(status);
                  }}
                  activeSpecialFilter={
                    activeSpecialFilter === "my_tasks" ||
                    activeSpecialFilter === "revisions"
                      ? activeSpecialFilter
                      : null
                  }
                  statusFilter={statusFilter}
                />
              )}

              {currentUser.role === Role.VERIFIKATOR && (
                <VerifierOverview
                  complaints={complaints}
                  onSelectPendingVerification={() => {
                    setActiveSpecialFilter(null);
                    setStatusFilter("MENUNGGU_VERIFIKASI");
                  }}
                  onSelectApproved={() => {
                    setActiveSpecialFilter(null);
                    setStatusFilter("TERVERIFIKASI");
                  }}
                  statusFilter={statusFilter}
                />
              )}
            </>
          )}

          {/* Header Info ketika di Menu Complaints atau Verifications */}
          {activeMenu === "complaints" && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Daftar Keluhan Pelanggan Terpusat
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitoring dan kelola siklus penanganan seluruh tiket keluhan operasional KAI.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 self-start sm:self-auto">
                Total: {complaints.length} Tiket
              </span>
            </div>
          )}

          {activeMenu === "verifications" && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {currentUser.role === Role.ADMIN
                    ? "Daftar Keluhan Terverifikasi"
                    : "Verifikasi Keluhan Layanan"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentUser.role === Role.ADMIN
                    ? "Keluhan operasional yang telah disahkan oleh tim verifikator secara resmi (Mode Baca Saja)."
                    : "Tinjau kelengkapan tindakan perbaikan dan foto bukti lapangan sebelum status disetujui."}
                </p>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-xl border self-start sm:self-auto ${
                  currentUser.role === Role.ADMIN
                    ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                    : "bg-purple-50 text-purple-900 border-purple-200"
                }`}
              >
                {currentUser.role === Role.ADMIN
                  ? `Terverifikasi: ${complaints.filter((c) => c.status === "TERVERIFIKASI").length} Tiket`
                  : `Menunggu: ${countVerif} Tiket`}
              </span>
            </div>
          )}

          {/* Tabel Pengelolaan Keluhan */}
          <ComplaintTable
            complaints={displayedComplaints}
            currentUser={currentUser}
            activeMenu={activeMenu}
            statusFilter={statusFilter}
            onSelectStatusFilter={(status) => {
              setActiveSpecialFilter(null);
              setStatusFilter(status);
            }}
            sourceFilter={sourceFilter}
            onSelectSourceFilter={(source) => setSourceFilter(source)}
            searchQuery={searchQuery}
            onSearchQueryChange={(q) => setSearchQuery(q)}
            picOnlyFilter={picOnlyFilter}
            onTogglePicOnly={(val) => {
              setActiveSpecialFilter(val ? "my_tasks" : null);
              setPicOnlyFilter(val);
            }}
            onViewDetail={(item) => setSelectedViewComplaint(item)}
            onOpenAction={(item) => setSelectedComplaint(item)}
            onDeleteComplaint={
              currentUser.role === Role.ADMIN
                ? (item) => setComplaintToDelete(item)
                : undefined
            }
            onExportExcel={() => {
              // Data ekspor difilter sesuai hak akses role:
              // Admin: semua data yang ditampilkan
              // PIC: hanya keluhan yang menjadi tanggung jawabnya
              // Verifikator: data yang ditampilkan (sudah difilter server-side)
              const exportData =
                currentUser.role === Role.PIC
                  ? displayedComplaints.filter(isAssignedToCurrentUser)
                  : displayedComplaints;
              exportComplaintsToExcel(exportData, {
                filenamePrefix:
                  currentUser.role === Role.PIC
                    ? `FR_SM_TI_033_001_Tugas_${(currentUser.name || "PIC").replace(/\s+/g, "_")}`
                    : currentUser.role === Role.VERIFIKATOR
                    ? "FR_SM_TI_033_001_Verifikasi_Keluhan_KAI"
                    : "FR_SM_TI_033_001_Keluhan_Pelanggan_KAI",
              });
              showToast("Rekapitulasi keluhan berhasil diekspor ke Excel (.xlsx)!");
            }}
            isAssignedToCurrentUser={isAssignedToCurrentUser}
          />
        </main>
      </div>

      {/* ======================================================== */}
      {/* 3. MODALS                                                */}
      {/* ======================================================== */}
      {/* Modal 1: Catat Keluhan Baru (Admin) */}
      {isCreateModalOpen && currentUser.role === Role.ADMIN && (
        <ComplaintCreateModal
          picList={picList}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateSubmit}
          isLoading={createLoading || isPending}
        />
      )}

      {/* Modal 2: Tindak Lanjut / Eksekusi (Role-based) */}
      {selectedComplaint && (
        <ComplaintActionModal
          complaint={selectedComplaint}
          currentUser={currentUser}
          picList={picList}
          onClose={() => setSelectedComplaint(null)}
          onSaveAdminDetails={handleSaveAdminDetails}
          onUpdatePicProgress={handleUpdatePicProgress}
          onVerify={handleVerify}
          isAssignedToCurrentUser={isAssignedToCurrentUser}
          isLoading={actionLoading || isPending}
        />
      )}

      {/* Modal 3: Lihat Detail Kronologis Keluhan (Read-only) */}
      {selectedViewComplaint && (
        <ComplaintDetailModal
          complaint={selectedViewComplaint}
          onClose={() => setSelectedViewComplaint(null)}
          onOpenEditMode={(comp) => setSelectedComplaint(comp)}
          isReadOnly={activeMenu === "verifications" && currentUser.role === Role.ADMIN}
        />
      )}

      {/* Modal 4: Konfirmasi Hapus Keluhan (Khusus Admin) */}
      {complaintToDelete && currentUser.role === Role.ADMIN && (
        <ComplaintDeleteModal
          complaint={complaintToDelete}
          onClose={() => setComplaintToDelete(null)}
          onConfirmDelete={handleDeleteComplaint}
          isLoading={deleteLoading || isPending}
        />
      )}

      {/* Modal 5: Dokumen Cetak KAI FR.SM/TI/033.001 */}
      {isDocModalOpen && (
        <KaiDocumentModal
          complaints={complaints}
          currentUser={currentUser}
          onClose={() => setIsDocModalOpen(false)}
        />
      )}

      {/* 4. Toast Notification */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
