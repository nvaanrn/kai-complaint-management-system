"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ComplaintData, UserSummary, Role, VerificationResult } from "@/types/database";

interface ComplaintActionModalProps {
  complaint: ComplaintData;
  currentUser: UserSummary;
  picList: UserSummary[];
  onClose: () => void;
  onSaveAdminDetails: (data: {
    customerName: string;
    customerContact?: string;
    daopOrStation?: string;
    source: string;
    date: string;
    description: string;
    picId?: string | null;
  }) => Promise<void>;
  onUpdatePicProgress: (
    data: {
      correctiveAction: string;
      preventiveAction: string;
      proofImageUrl?: string | null;
      notes?: string;
    },
    submitForVerification: boolean
  ) => Promise<void>;
  onVerify: (result: VerificationResult, feedback: string) => Promise<void>;
  isAssignedToCurrentUser: (item: ComplaintData) => boolean;
  isLoading: boolean;
}

export default function ComplaintActionModal({
  complaint,
  currentUser,
  picList,
  onClose,
  onSaveAdminDetails,
  onUpdatePicProgress,
  onVerify,
  isAssignedToCurrentUser,
  isLoading,
}: ComplaintActionModalProps) {
  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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

  // State: Admin Fields
  const [adminCustomerName, setAdminCustomerName] = useState(complaint.customerName);
  const [adminCustomerContact, setAdminCustomerContact] = useState(complaint.customerContact || "");
  const [adminDaopOrStation, setAdminDaopOrStation] = useState(complaint.daopOrStation || "Kantor Pusat KAI Bandung");
  const [adminSource, setAdminSource] = useState(complaint.source);
  const [adminDate, setAdminDate] = useState(
    complaint.date ? new Date(complaint.date).toISOString().split("T")[0] : ""
  );
  const [adminDescription, setAdminDescription] = useState(complaint.description);
  const [adminPicId, setAdminPicId] = useState<string>(complaint.pic?.id || "");

  // State: PIC Fields
  const [picCorrectiveAction, setPicCorrectiveAction] = useState(complaint.correctiveAction || "");
  const [picPreventiveAction, setPicPreventiveAction] = useState(complaint.preventiveAction || "");
  const [picProofImageUrl, setPicProofImageUrl] = useState<string | null>(complaint.proofImageUrl || null);
  const [picNotes, setPicNotes] = useState(complaint.notes || "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // State: Verifier Fields
  const [verificationFeedback, setVerificationFeedback] = useState("");
  const [verificationError, setVerificationError] = useState("");

  // Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Ukuran file melebihi batas maksimal 5MB.");
      return;
    }

    try {
      setUploadingImage(true);
      setUploadError("");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah foto bukti.");
      }

      setPicProofImageUrl(data.url);
    } catch (err: any) {
      setUploadError(err.message || "Gagal mengunggah gambar. Silakan coba lagi.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Submit Admin Edit
  const handleSubmitAdmin = async () => {
    if (adminCustomerName.trim().length < 3) {
      setUploadError("Nama pelapor minimal 3 karakter.");
      return;
    }
    if (adminDescription.trim().length < 10) {
      setUploadError("Uraian keluhan minimal 10 karakter.");
      return;
    }
    setUploadError("");
    await onSaveAdminDetails({
      customerName: adminCustomerName.trim(),
      customerContact: adminCustomerContact.trim() || undefined,
      daopOrStation: adminDaopOrStation,
      source: adminSource,
      date: adminDate,
      description: adminDescription.trim(),
      picId: adminPicId ? adminPicId : null,
    });
  };

  // Submit PIC Progress
  const handleSubmitPic = async (submitForVerification: boolean) => {
    if (submitForVerification) {
      if (picCorrectiveAction.trim().length < 5) {
        setUploadError("Tindakan perbaikan minimal 5 karakter sebelum diajukan ke Verifikator.");
        return;
      }
      if (picPreventiveAction.trim().length < 5) {
        setUploadError("Tindakan pencegahan minimal 5 karakter sebelum diajukan ke Verifikator.");
        return;
      }
      if (!picProofImageUrl) {
        setUploadError("Foto bukti hasil perbaikan wajib dilampirkan sebelum diajukan ke Verifikator.");
        return;
      }
    }
    setUploadError("");
    await onUpdatePicProgress(
      {
        correctiveAction: picCorrectiveAction.trim(),
        preventiveAction: picPreventiveAction.trim(),
        proofImageUrl: picProofImageUrl,
        notes: picNotes.trim(),
      },
      submitForVerification
    );
  };

  // Submit Verifier Decision
  const handleVerifyDecision = async (result: VerificationResult) => {
    if (result === VerificationResult.REJECTED && !verificationFeedback.trim()) {
      setVerificationError("Alasan / catatan revisi wajib diisi jika menolak hasil penanganan.");
      return;
    }
    setVerificationError("");
    await onVerify(result, verificationFeedback.trim());
  };

  const isAssigned = isAssignedToCurrentUser(complaint);
  const lastVerif = complaint.verifications && complaint.verifications.length > 0 ? complaint.verifications[0] : null;
  const isRejectedBefore = lastVerif?.result === VerificationResult.REJECTED;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col my-auto animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded tracking-wide flex items-center gap-1">
                <span>✏️</span>
                <span>Mode Eksekusi</span>
              </span>
              <span className="font-mono text-xs font-bold bg-blue-600 px-2.5 py-0.5 rounded text-white tracking-wide">
                {complaint.complaintNumber}
              </span>
              <span className="text-xs text-slate-400">
                {formatDate(complaint.date)}
              </span>
            </div>
            <h3 id="action-modal-title" className="text-base sm:text-lg font-bold mt-1 text-slate-100">
              {complaint.customerName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela aksi"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition text-lg cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Timeline Siklus Hidup */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Status Alur Kerja:
            </span>
            <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-semibold">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                1. Registrasi
              </div>
              <div
                className={`p-1.5 rounded-lg border ${
                  complaint.status !== "BELUM_DITANGANI"
                    ? "bg-sky-100 text-sky-900 border-sky-300"
                    : "bg-slate-100 text-slate-400 border-slate-200"
                }`}
              >
                2. Penanganan PIC
              </div>
              <div
                className={`p-1.5 rounded-lg border ${
                  complaint.status === "MENUNGGU_VERIFIKASI" || complaint.status === "TERVERIFIKASI"
                    ? "bg-purple-100 text-purple-900 border-purple-300"
                    : "bg-slate-100 text-slate-400 border-slate-200"
                }`}
              >
                3. Verifikasi
              </div>
              <div
                className={`p-1.5 rounded-lg border ${
                  complaint.status === "TERVERIFIKASI"
                    ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                    : "bg-slate-100 text-slate-400 border-slate-200"
                }`}
              >
                4. Terverifikasi
              </div>
            </div>
          </div>

          {/* Alert Jika Ada Catatan Penolakan / Revisi Verifikator */}
          {isRejectedBefore && lastVerif && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-1">
              <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <span>⚠️</span> Catatan Penolakan / Permintaan Revisi dari Verifikator:
              </span>
              <p className="text-xs text-rose-800 italic bg-white/70 p-2.5 rounded-lg border border-rose-200">
                &ldquo;{lastVerif.feedback}&rdquo;
              </p>
              <p className="text-[10px] text-rose-600">
                Diverifikasi oleh: {lastVerif.verifier.name} &bull; {formatDate(lastVerif.verifiedAt)}
              </p>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 1: FORM ADMIN (EDIT DATA & PENUGASAN PIC)        */}
          {/* ======================================================== */}
          {currentUser.role === Role.ADMIN ? (
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
                    Nama Pelapor / Pengguna <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={adminCustomerName}
                    onChange={(e) => setAdminCustomerName(e.target.value)}
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
                    value={adminCustomerContact}
                    onChange={(e) => setAdminCustomerContact(e.target.value)}
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
                    value={adminDaopOrStation}
                    onChange={(e) => setAdminDaopOrStation(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sumber Keluhan
                  </label>
                  <select
                    value={adminSource}
                    onChange={(e) => setAdminSource(e.target.value)}
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
                    value={adminDate}
                    onChange={(e) => setAdminDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tugaskan Petugas PIC
                  </label>
                  <select
                    value={adminPicId}
                    onChange={(e) => setAdminPicId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
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
                  Deskripsi Keluhan Masuk <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={adminDescription}
                  onChange={(e) => setAdminDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-blue-200/60">
                <span className="text-xs text-slate-500">
                  Status Saat Ini: <b>{complaint.status}</b>
                </span>
                <button
                  type="button"
                  disabled={isLoading || !adminCustomerName.trim() || !adminDescription.trim()}
                  onClick={handleSubmitAdmin}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-40"
                >
                  {isLoading ? "Menyimpan..." : "Simpan Perubahan Data & PIC"}
                </button>
              </div>
            </div>
          ) : (
            /* Ringkasan Laporan untuk PIC / Verifikator */
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 flex-wrap gap-2">
                <div>
                  <span className="font-bold text-slate-900 text-sm">{complaint.customerName}</span>
                  {complaint.daopOrStation && (
                    <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 ml-2 font-medium">
                      {complaint.daopOrStation}
                    </span>
                  )}
                </div>
                <span className="text-slate-500">{complaint.source} &bull; {formatDate(complaint.date)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Uraian Masalah / Keluhan:
                </span>
                <p className="text-slate-800 whitespace-pre-wrap">{complaint.description}</p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 2: FORM PIC (TINDAKAN PERBAIKAN & UPLOAD BUKTI)  */}
          {/* ======================================================== */}
          {currentUser.role === Role.PIC && (
            <div className="space-y-4 pt-2">
              {isAssigned ? (
                /* FORM AKTIF JIKA DITUGASKAN KE PIC INI */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Formulir Eksekusi Penanganan (PIC)
                      </h4>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        ✓ Keluhan ini ditugaskan kepada Anda.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                      Tugas Anda
                    </span>
                  </div>

                  {/* Tindakan Perbaikan */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tindakan Perbaikan (Corrective Action) <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Uraikan tindakan perbaikan langsung yang dilakukan..."
                      value={picCorrectiveAction}
                      onChange={(e) => setPicCorrectiveAction(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none bg-white"
                    />
                  </div>

                  {/* Tindakan Pencegahan */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tindakan Pencegahan (Preventive Action) <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Uraikan tindakan pencegahan agar kendala tidak berulang..."
                      value={picPreventiveAction}
                      onChange={(e) => setPicPreventiveAction(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none bg-white"
                    />
                  </div>

                  {/* Unggah Foto Bukti */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Unggah Foto Bukti Hasil Perbaikan <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">PNG, JPG, WEBP &bull; Maks 5MB</span>
                    </div>

                    {uploadError && (
                      <div className="p-2 mb-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                        {uploadError}
                      </div>
                    )}

                    {picProofImageUrl ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <span>✓</span> Foto Bukti Terpasang
                          </span>
                          <div className="flex items-center gap-3">
                            <a
                              href={picProofImageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1"
                            >
                              <span>Buka Penuh</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => setPicProofImageUrl(null)}
                              className="text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                            >
                              Ganti Foto
                            </button>
                          </div>
                        </div>
                        <div className="relative w-full max-h-48 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={picProofImageUrl}
                            alt="Foto Bukti Perbaikan"
                            className="w-full max-h-48 object-contain"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-4 text-center bg-slate-50/50 hover:bg-blue-50/30 transition">
                        <input
                          type="file"
                          id="pic-action-upload"
                          accept="image/png,image/jpeg,image/webp"
                          disabled={uploadingImage}
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <label htmlFor="pic-action-upload" className="cursor-pointer block">
                          <svg className="w-7 h-7 mx-auto text-slate-400 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs font-semibold text-blue-900 block">
                            {uploadingImage ? "Sedang Mengunggah Foto..." : "Pilih / Ambil Foto Bukti Fisik"}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Wajib dilampirkan sebelum diajukan ke Verifikator
                          </span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Catatan Tambahan */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Catatan Tambahan Pelaksanaan <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Catatan pelaksanaan atau estimasi waktu..."
                      value={picNotes}
                      onChange={(e) => setPicNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                    />
                  </div>

                  {/* Warning jika belum lengkap */}
                  {(!picCorrectiveAction.trim() || !picPreventiveAction.trim() || !picProofImageUrl) && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                      <span>⚠️</span>
                      <span>
                        Tindakan perbaikan, pencegahan, dan foto bukti fisik wajib diisi untuk mengajukan verifikasi.
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      disabled={isLoading || !picCorrectiveAction.trim()}
                      onClick={() => handleSubmitPic(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-40"
                    >
                      {isLoading ? "Menyimpan..." : "Simpan Draf Tindakan"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        isLoading ||
                        !picCorrectiveAction.trim() ||
                        !picPreventiveAction.trim() ||
                        !picProofImageUrl
                      }
                      onClick={() => handleSubmitPic(true)}
                      className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-md cursor-pointer disabled:opacity-40"
                    >
                      {isLoading ? "Memproses..." : "Submit untuk Verifikasi →"}
                    </button>
                  </div>
                </div>
              ) : (
                /* READ ONLY JIKA BUKAN DITUGASKAN KE PIC INI */
                <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <span>ℹ️</span>
                    <span>Status Penugasan: {complaint.pic ? complaint.pic.name : "Belum Ditugaskan"}</span>
                  </div>
                  <p>
                    Anda dapat memantau tiket ini, namun pengisian tindakan perbaikan hanya dapat dilakukan oleh PIC yang ditunjuk resmi oleh Admin ({complaint.pic ? complaint.pic.name : "menunggu penunjukan Admin"}).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 3: HASIL PIC UNTUK NON-PIC (VERIFIKATOR/ADMIN)    */}
          {/* ======================================================== */}
          {currentUser.role !== Role.PIC && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Hasil Tindakan Penanganan PIC
              </span>

              <div className="space-y-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Tindakan Perbaikan (Corrective Action)
                  </span>
                  <p className="text-xs text-slate-800 mt-1 whitespace-pre-wrap">
                    {complaint.correctiveAction || (
                      <span className="text-slate-400 italic">Belum ada tindakan perbaikan dari PIC.</span>
                    )}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Tindakan Pencegahan (Preventive Action)
                  </span>
                  <p className="text-xs text-slate-800 mt-1 whitespace-pre-wrap">
                    {complaint.preventiveAction || (
                      <span className="text-slate-400 italic">Belum ada tindakan pencegahan dari PIC.</span>
                    )}
                  </p>
                </div>

                {/* Foto Bukti */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Foto Bukti Hasil Perbaikan
                    </span>
                    {complaint.proofImageUrl && (
                      <a
                        href={complaint.proofImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1"
                      >
                        <span>Lihat Penuh</span>
                      </a>
                    )}
                  </div>
                  {complaint.proofImageUrl ? (
                    <div className="relative w-full max-h-52 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={complaint.proofImageUrl}
                        alt="Bukti Perbaikan"
                        className="w-full max-h-52 object-contain"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Belum ada foto bukti perbaikan yang diunggah.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 4: PANEL KEPUTUSAN VERIFIKATOR                   */}
          {/* ======================================================== */}
          {currentUser.role === Role.VERIFIKATOR && (
            <div className="space-y-3 pt-4 border-t border-purple-100 bg-purple-50/60 p-4 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🛡️</span> Panel Keputusan Verifikasi Mutu
                </h4>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  Role Verifikator
                </span>
              </div>

              {verificationError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {verificationError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Hasil / Catatan Verifikasi Mutu <span className="text-rose-500 font-bold">* (Wajib jika menolak)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ketik catatan mutu (misal: Sesuai standar mutu, atau alasan mengapa perbaikan ditolak)..."
                  value={verificationFeedback}
                  onChange={(e) => {
                    setVerificationFeedback(e.target.value);
                    if (verificationError) setVerificationError("");
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleVerifyDecision(VerificationResult.REJECTED)}
                  className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer disabled:opacity-40"
                >
                  Tolak (Perlu Revisi PIC)
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleVerifyDecision(VerificationResult.APPROVED)}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md cursor-pointer disabled:opacity-40"
                >
                  {isLoading ? "Menyimpan..." : "Setujui & Verifikasi (Selesai)"}
                </button>
              </div>
            </div>
          )}

          {/* Histori Verifikasi Lengkap */}
          {complaint.verifications && complaint.verifications.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Histori Keputusan Verifikasi:
              </span>
              <div className="space-y-2">
                {complaint.verifications.map((v) => (
                  <div
                    key={v.id}
                    className={`p-3 rounded-xl border text-xs ${
                      v.result === VerificationResult.APPROVED
                        ? "bg-emerald-50/50 border-emerald-200"
                        : "bg-rose-50/50 border-rose-200"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className={v.result === VerificationResult.APPROVED ? "text-emerald-800" : "text-rose-800"}>
                        {v.result === VerificationResult.APPROVED ? "✓ Disetujui (Approved)" : "⚠️ Ditolak (Rejected)"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDate(v.verifiedAt)}
                      </span>
                    </div>
                    {v.feedback && (
                      <p className="mt-1 text-slate-700 italic bg-white/60 p-2 rounded-lg border border-slate-200/50">
                        &ldquo;{v.feedback}&rdquo;
                      </p>
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
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
