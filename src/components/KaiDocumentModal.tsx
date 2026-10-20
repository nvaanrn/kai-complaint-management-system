"use client";

import React, { useState, useEffect } from "react";
import { ComplaintData, Role, VerificationResult } from "@/types/database";
import {
  createDocumentBatch,
  getPublishedDocument,
  getPublishedDocumentsList,
} from "@/app/actions/complaints";
import { exportComplaintsToExcel } from "@/lib/exportExcel";
import KaiDocumentView from "./KaiDocumentView";
import Image from "next/image";

interface KaiDocumentModalProps {
  complaints: ComplaintData[];
  onClose: () => void;
  currentUser: {
    name?: string | null;
    role?: string;
  };
}

export default function KaiDocumentModal({
  complaints,
  onClose,
  currentUser,
}: KaiDocumentModalProps) {
  // Helper untuk memetakan snapshot beku ke struktur data tampilan ComplaintData
  function mapSnapshotToComplaints(snapshotData: any[]): ComplaintData[] {
    if (!Array.isArray(snapshotData)) return [];
    return snapshotData.map((s: any) => ({
      id: s.complaintId || s.id || `snapshot-${Math.random()}`,
      complaintNumber: s.complaintNumber,
      date: s.date,
      customerName: s.customerName,
      customerContact: s.customerContact || null,
      daopOrStation: s.daopOrStation || null,
      source: s.source,
      category: s.category || null,
      description: s.description,
      status: s.status || "TERVERIFIKASI",
      picId: null,
      pic: s.picName ? { id: "", name: s.picName, email: "", role: Role.PIC } : null,
      correctiveAction: s.correctiveAction || null,
      preventiveAction: s.preventiveAction || null,
      proofImageUrl: s.proofImageUrl || null,
      notes: s.notes || null,
      verifications: s.verifiedAt
        ? [
            {
              id: `verif-snap-${s.complaintId || s.id}`,
              complaintId: s.complaintId || s.id,
              verifierId: "verifier",
              verifier: {
                id: "verifier",
                name: s.verifierName || "Verifikator Mutu",
                email: "",
                role: Role.VERIFIKATOR,
              },
              result: VerificationResult.APPROVED,
              feedback: s.verificationFeedback || "Disetujui",
              cycle: s.cycle || 1,
              verifiedAt: s.verifiedAt,
            },
          ]
        : [],
      createdAt: s.date,
      updatedAt: s.date,
    }));
  }

  // Hanya ambil keluhan yang sudah TERVERIFIKASI sebagai pilihan default
  const verifiedComplaints = complaints.filter((c) => c.status === "TERVERIFIKASI");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    verifiedComplaints.length > 0
      ? verifiedComplaints.map((c) => c.id)
      : complaints.slice(0, 10).map((c) => c.id)
  );

  const [docNumber, setDocNumber] = useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `FR.SM/TI/033.001/${mm}-${yyyy}`;
  });

  const [docDate, setDocDate] = useState(() => {
    return new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  });

  // Versi formulir standar KAI resmi ISO FR.SM/TI/033.001 edisi 002-2020
  const [docVersion, setDocVersion] = useState("002-2020");

  const [managementRep, setManagementRep] = useState("Ir. Bambang Triyono (MR)");
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [archivedSnapshot, setArchivedSnapshot] = useState<ComplaintData[] | null>(null);
  const [publishedDocsList, setPublishedDocsList] = useState<any[]>([]);
  const [selectedArchiveId, setSelectedArchiveId] = useState<string>("");
  const [isRevisionMode, setIsRevisionMode] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Muat daftar arsip dokumen resmi jika ada di database
  useEffect(() => {
    let isMounted = true;
    async function loadArchives() {
      try {
        const res = await getPublishedDocumentsList();
        if (res.success && res.data && isMounted) {
          setPublishedDocsList(res.data);
        }
      } catch (err) {
        console.error("Gagal memuat daftar arsip dokumen:", err);
      }
    }
    loadArchives();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handler memilih dokumen dari arsip resmi
  const handleSelectArchive = async (archiveId: string) => {
    setSelectedArchiveId(archiveId);
    setIsRevisionMode(false);
    setRevisionReason("");

    if (!archiveId) {
      // Kembali ke mode pembuatan dokumen aktif
      setIsPublished(false);
      setArchivedSnapshot(null);
      return;
    }

    try {
      // Mengambil dokumen arsip berdasarkan ID unik untuk keakuratan audit
      const res = await getPublishedDocument(archiveId);
      if (res.success && res.data) {
        const doc = res.data;
        setDocNumber(doc.documentNumber);
        setDocVersion(doc.version || "002-2020");
        setManagementRep(doc.managementRep || "Management Representative KAI");
        if (doc.documentDate) {
          setDocDate(
            new Date(doc.documentDate).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          );
        }

        // Petakan snapshot beku (immutable snapshot) kembali ke struktur ComplaintData
        if (Array.isArray(doc.snapshotData) && doc.snapshotData.length > 0) {
          const snapshotList = mapSnapshotToComplaints(doc.snapshotData);
          setArchivedSnapshot(snapshotList);
          setIsPublished(true);
          setIsPreview(true);
          setNotification({
            type: "success",
            message: `Arsip resmi ${doc.documentNumber} (Revisi ke-${doc.revisionNumber}) berhasil dimuat dari snapshot beku. Data terkunci.`,
          });
        } else {
          // Arsip historis lama yang belum memiliki snapshot beku lengkap
          setArchivedSnapshot([]);
          setIsPublished(true);
          setIsPreview(true);
          setNotification({
            type: "error",
            message: `Perhatian: Dokumen arsip ${doc.documentNumber} dibuat sebelum implementasi snapshot beku sehingga tidak memiliki rekaman beku.`,
          });
        }
      } else {
        setNotification({
          type: "error",
          message: res.error || "Gagal memuat rincian arsip dokumen resmi.",
        });
      }
    } catch (err) {
      console.error("Gagal mengambil data arsip:", err);
      setNotification({
        type: "error",
        message: "Gagal memuat rincian arsip dokumen resmi.",
      });
    }
  };

  const toggleSelect = (id: string) => {
    if (isPublished) return; // Terkunci jika arsip terbit
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (isPublished) return;
    setSelectedIds(complaints.map((c) => c.id));
  };

  const deselectAll = () => {
    if (isPublished) return;
    setSelectedIds([]);
  };

  // Sumber data keluhan: jika sedang melihat arsip resmi gunakan snapshot beku, jika draf gunakan keluhan terpilih
  const displayList: ComplaintData[] =
    isPublished && archivedSnapshot
      ? archivedSnapshot
      : complaints.filter((c) => selectedIds.includes(c.id));

  // FITUR CETAK (PRINT)
  // Menyiapkan dokumen dengan format baku KAI dan memicu dialog cetak browser
  // TIDAK MENGUBAH / MEMUTASI DATABASE
  const handlePrint = () => {
    if (displayList.length === 0) {
      setNotification({
        type: "error",
        message: "Pilih minimal 1 keluhan untuk dicetak.",
      });
      return;
    }

    if (!isPreview) {
      setIsPreview(true);
      // Beri jeda sejenak agar DOM layout siap sebelum dialog cetak browser terbuka
      setTimeout(() => {
        window.print();
      }, 200);
    } else {
      window.print();
    }
  };

  // FITUR EKSPOR EXCEL
  // Menghasilkan spreadsheet sesuai formulir FR.SM/TI/033.001
  const handleExportExcelFromModal = () => {
    if (displayList.length === 0) return;
    exportComplaintsToExcel(displayList, {
      documentNumber: docNumber,
      documentDate: docDate,
      version: docVersion,
      filenamePrefix: `FR_SM_TI_033_001_${docNumber.replace(/[\/\\:]/g, "-")}`,
    });
  };

  // FITUR UNDUH PDF
  // Menghasilkan berkas PDF resmi sesuai spesifikasi dokumen KAI via @react-pdf/renderer
  // TIDAK MENGUBAH / MEMUTASI DATABASE
  const handleDownloadPdf = async () => {
    if (displayList.length === 0) {
      setNotification({
        type: "error",
        message: "Pilih minimal 1 keluhan untuk diunduh sebagai PDF.",
      });
      return;
    }

    setIsDownloading(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { KaiDocumentPdf } = await import("@/components/pdf/KaiDocumentPdf");

      const logoUrl =
        typeof window !== "undefined" ? window.location.origin + "/kai-logo.png" : undefined;

      const blob = await pdf(
        <KaiDocumentPdf
          complaints={displayList}
          documentNumber={docNumber}
          documentDate={docDate}
          version={docVersion}
          managementRep={managementRep}
          creatorName={currentUser.name || "Administrator KAI"}
          logoUrl={logoUrl}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FR-SM-TI-033-001_${docNumber.replace(/[\/\\:]/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Gagal mengunduh dokumen PDF:", error);
      setNotification({
        type: "error",
        message: "Terjadi kesalahan saat memproses unduhan berkas PDF.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // FITUR PENERBITAN DOKUMEN RESMI (KHUSUS ADMIN)
  // Membekukan keluhan ke dalam immutable snapshot arsip permanen
  const handlePublishBatch = async () => {
    if (selectedIds.length === 0) {
      setNotification({
        type: "error",
        message: "Pilih minimal 1 keluhan untuk diterbitkan.",
      });
      return;
    }

    if (currentUser.role !== Role.ADMIN) {
      setNotification({
        type: "error",
        message: "Hanya Admin yang berwenang menerbitkan dokumen rekapitulasi audit resmi.",
      });
      return;
    }

    if (isRevisionMode && !revisionReason.trim()) {
      setNotification({
        type: "error",
        message: "Alasan revisi wajib diisi saat menerbitkan dokumen versi revisi.",
      });
      return;
    }

    // Periksa status keluhan
    const unverified = displayList.filter((c) => c.status !== "TERVERIFIKASI");
    if (unverified.length > 0) {
      setNotification({
        type: "error",
        message: `Keluhan ${unverified[0].complaintNumber} belum TERVERIFIKASI. Hanya keluhan terverifikasi yang dapat diterbitkan.`,
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await createDocumentBatch({
        complaintIds: selectedIds,
        documentNumber: docNumber,
        version: docVersion,
        managementRep,
        parentDocumentId: isRevisionMode && selectedArchiveId ? selectedArchiveId : undefined,
        revisionReason: isRevisionMode ? revisionReason : undefined,
      });

      if (result.success && result.data) {
        const createdDoc = result.data;
        setDocNumber(createdDoc.documentNumber);
        setDocVersion(createdDoc.version || "002-2020");
        if (createdDoc.documentDate) {
          setDocDate(
            new Date(createdDoc.documentDate).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          );
        }
        setManagementRep(createdDoc.managementRep);
        setSelectedArchiveId(createdDoc.id);

        // Kunci snapshot arsip beku ke state tampilan
        if (Array.isArray(createdDoc.snapshotData)) {
          const snapshotList = mapSnapshotToComplaints(createdDoc.snapshotData);
          setArchivedSnapshot(snapshotList);
        }

        setIsPublished(true);
        setIsPreview(true);
        setIsRevisionMode(false);
        setRevisionReason("");

        setNotification({
          type: "success",
          message: `Dokumen ${createdDoc.documentNumber} (Revisi ke-${createdDoc.revisionNumber}) berhasil diterbitkan resmi. Snapshot data telah terkunci.`,
        });

        // Muat ulang daftar arsip
        const resArchives = await getPublishedDocumentsList();
        if (resArchives.success && resArchives.data) {
          setPublishedDocsList(resArchives.data);
        }
      } else {
        setNotification({
          type: "error",
          message: result.error || "Gagal menerbitkan dokumen resmi.",
        });
      }
    } catch (err: any) {
      console.error("Gagal menerbitkan dokumen:", err);
      setNotification({
        type: "error",
        message: err.message || "Gagal menerbitkan dokumen resmi.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatItemDate = (val: Date | string) => {
    const d = new Date(val);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="kai-document-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="kai-document-modal-card w-full max-w-7xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-4 max-h-[96vh]">
        {/* Modal Top Bar (Screen Only - Disembunyikan saat Print) */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden modal-action-bar">
          <div className="flex items-center gap-3">
            <Image
              src="/kai-logo.png"
              alt="KAI Logo"
              width={75}
              height={26}
              className="h-7 w-auto bg-white p-1 rounded-md object-contain"
              unoptimized
            />
            <div>
              <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
                <span>Dokumen Standar FR.SM/TI/033.001</span>
                <span className="text-[10px] bg-yellow-400 text-slate-950 font-black px-2 py-0.5 rounded">
                  TERBATAS
                </span>
                {isPublished && (
                  <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded shadow-2xs">
                    TERKUNCI / TERBIT
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Pengelolaan dan Penanganan Keluhan Pelanggan PT Kereta Api Indonesia (Persero)
              </p>
            </div>
          </div>

          {/* Tombol Aksi Utama */}
          <div className="flex flex-wrap items-center gap-2">
            {!isPreview ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsPreview(true)}
                  disabled={displayList.length === 0}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition cursor-pointer disabled:opacity-50 shadow-xs flex items-center gap-1.5"
                >
                  <span>Pratinjau Format Baku</span>
                  <span>&rarr;</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={displayList.length === 0}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Cetak langsung melalui dialog print komputer"
                >
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print / Cetak</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsPreview(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  &larr; Ubah Pilihan
                </button>

                {/* Tombol Ekspor Excel */}
                <button
                  type="button"
                  onClick={handleExportExcelFromModal}
                  disabled={displayList.length === 0}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-100 bg-emerald-700 hover:bg-emerald-600 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Unduh format spreadsheet Excel persis formulir KAI (.xlsx)"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Ekspor Excel (.xlsx)</span>
                </button>

                {/* Tombol Unduh PDF Resmi */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading || displayList.length === 0}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-600 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Unduh berkas PDF resmi KAI"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>{isDownloading ? "Memproses PDF..." : "Unduh PDF"}</span>
                </button>

                {/* Tombol Cetak / Print Browser */}
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={displayList.length === 0}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
                  title="Buka dialog cetak sistem komputer pengguna"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print / Cetak</span>
                </button>

                {/* Tombol Revisi Dokumen (Khusus Admin saat membuka dokumen arsip terbit) */}
                {currentUser.role === Role.ADMIN && isPublished && selectedArchiveId && !isRevisionMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsRevisionMode(true);
                      setIsPublished(false);
                      setIsPreview(false);
                      setNotification({
                        type: "success",
                        message: "Mode Revisi Dokumen aktif. Anda dapat mengubah pilihan keluhan dan mengisi alasan revisi.",
                      });
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-sky-200 hover:text-white bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Buat versi revisi resmi baru yang terhubung ke dokumen induk ini"
                  >
                    <svg className="w-3.5 h-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Revisi Dokumen</span>
                  </button>
                )}

                {/* Tombol Batalkan Mode Revisi */}
                {isRevisionMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsRevisionMode(false);
                      setIsPublished(true);
                      setIsPreview(true);
                      setNotification(null);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    Batal Revisi
                  </button>
                )}

                {/* Tombol Terbitkan Dokumen (Khusus Admin bila belum diterbitkan atau dalam mode revisi) */}
                {currentUser.role === Role.ADMIN && !isPublished && (
                  <button
                    type="button"
                    onClick={handlePublishBatch}
                    disabled={isSaving || displayList.length === 0}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      isRevisionMode
                        ? "text-sky-200 hover:text-white bg-sky-950/90 hover:bg-sky-900 border border-sky-600/70 shadow-md"
                        : "text-amber-200 hover:text-white bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60"
                    }`}
                    title={isRevisionMode ? "Terbitkan versi revisi resmi baru" : "Terbitkan secara resmi dan bekukan snapshot audit"}
                  >
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>{isSaving ? "Menerbitkan..." : isRevisionMode ? "Terbitkan Versi Revisi" : "Terbitkan & Kunci"}</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition text-lg cursor-pointer ml-1"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Notifikasi feedback */}
        {notification && (
          <div
            className={`px-4 py-2 text-xs flex items-center justify-between border-b print:hidden ${
              notification.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="kai-document-modal-body p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60 print:bg-white print:p-0">
          {/* TABEL PEMILIHAN KELUHAN & PENGATURAN METADATA (Tampil di layar saat !isPreview, selalu disembunyikan saat Cetak) */}
          <div className={`space-y-4 print:hidden ${!isPreview ? "block" : "hidden"}`}>
              {/* Opsi Memilih dari Arsip Dokumen Resmi yang Sudah Terbit */}
              {publishedDocsList.length > 0 && (
                <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-blue-900">
                      Buka Dokumen Resmi dari Arsip Mutu:
                    </h5>
                    <p className="text-[11px] text-blue-700">
                      Pilih dokumen yang telah diterbitkan untuk melihat atau mencetak salinan arsip asli.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedArchiveId}
                      onChange={(e) => handleSelectArchive(e.target.value)}
                      className="px-3 py-1.5 text-xs border border-blue-300 rounded-lg bg-white text-slate-800 font-medium"
                    >
                      <option value="">-- Buat Draf Dokumen Baru --</option>
                      {publishedDocsList.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.documentNumber} {doc.revisionNumber > 0 ? `(Rev. ${doc.revisionNumber})` : ""} ({doc.totalComplaints} keluhan) -{" "}
                          {new Date(doc.documentDate).toLocaleDateString("id-ID")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Panel Khusus Mode Revisi */}
              {isRevisionMode && (
                <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl text-xs space-y-2">
                  <div className="font-bold text-amber-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      <span>Mode Revisi Dokumen Kendali Mutu</span>
                    </div>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-mono px-2 py-0.5 rounded font-bold">
                      Induk: {docNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Dokumen baru akan diterbitkan sebagai revisi lanjutan dan dokumen induk lama akan diubah statusnya menjadi <b>SUPERSEDED</b> untuk kebutuhan audit.
                  </p>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Alasan Revisi Dokumen <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="text"
                      value={revisionReason}
                      onChange={(e) => setRevisionReason(e.target.value)}
                      placeholder="Contoh: Koreksi tindakan pencegahan keluhan AC setelah inspeksi lanjutan MR..."
                      className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Pengaturan Header Formulir */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Pengaturan Header Formulir FR.SM/TI/033.001
                  </h4>
                  {!isPublished && (
                    <button
                      type="button"
                      onClick={() => {
                        const todayStr = new Date().toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        });
                        setDocDate(todayStr);
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                    >
                      Gunakan Tanggal Hari Ini
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      No. Dokumen
                    </label>
                    <input
                      type="text"
                      disabled={isPublished}
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-slate-50/50 font-mono disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Tanggal Dokumen
                    </label>
                    <input
                      type="text"
                      disabled={isPublished}
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Versi Dokumen
                    </label>
                    <input
                      type="text"
                      disabled={isPublished}
                      value={docVersion}
                      onChange={(e) => setDocVersion(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-slate-50/50 font-mono disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Management Representative (MR)
                    </label>
                    <input
                      type="text"
                      disabled={isPublished}
                      value={managementRep}
                      onChange={(e) => setManagementRep(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Tabel Pemilihan Keluhan */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Pilih Keluhan ({selectedIds.length} dari {complaints.length} dipilih)
                    </span>
                    <span className="text-[11px] text-slate-400 block sm:inline sm:ml-2">
                      Sesuai standar ISO KAI, diutamakan keluhan yang berstatus <b>TERVERIFIKASI</b>.
                    </span>
                  </div>

                  {!isPublished && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={deselectAll}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Batal Pilih
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] uppercase font-semibold text-slate-500 border-b border-slate-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 w-10 text-center">Pilih</th>
                        <th className="px-4 py-3">No. Tiket</th>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3">Pelapor</th>
                        <th className="px-4 py-3">Sumber</th>
                        <th className="px-4 py-3">PIC Penanganan</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {complaints.map((item) => {
                        const isChecked = selectedIds.includes(item.id);
                        return (
                          <tr
                            key={item.id}
                            onClick={() => toggleSelect(item.id)}
                            className={`hover:bg-slate-50 cursor-pointer transition ${
                              isChecked ? "bg-blue-50/40" : ""
                            }`}
                          >
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                disabled={isPublished}
                                className="rounded text-blue-900 focus:ring-blue-600 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">
                              {item.complaintNumber}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {formatItemDate(item.date)}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {item.customerName}
                            </td>
                            <td className="px-4 py-3 text-slate-500">{item.source}</td>
                            <td className="px-4 py-3">
                              {item.pic ? item.pic.name : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.status === "TERVERIFIKASI"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          {/* PRATINJAU & AREA CETAK DOKUMEN BAKU PERSIS STANDAR KAI */}
          <div
            className={`kai-printable-container bg-white p-2 sm:p-6 rounded-xl shadow-lg border border-slate-300 w-full overflow-x-auto print:overflow-visible print:border-none print:shadow-none print:p-0 print:m-0 print:block ${
              isPreview ? "block" : "hidden print:block"
            }`}
          >
            <KaiDocumentView
              complaints={displayList}
              documentNumber={docNumber}
              documentDate={docDate}
              version={docVersion}
              managementRep={managementRep}
              creatorName={currentUser.name || "Administrator KAI"}
              pageInfo="1 dari 1"
              isPublished={isPublished}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
