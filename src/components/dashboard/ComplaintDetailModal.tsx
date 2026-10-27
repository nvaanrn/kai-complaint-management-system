"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { ComplaintData, VerificationResult } from "@/types/database";
import StatusBadge from "./StatusBadge";

interface ComplaintDetailModalProps {
  complaint: ComplaintData;
  onClose: () => void;
  onOpenEditMode: (complaint: ComplaintData) => void;
  isReadOnly?: boolean;
}

export default function ComplaintDetailModal({
  complaint,
  onClose,
  onOpenEditMode,
  isReadOnly = false,
}: ComplaintDetailModalProps) {
  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const formatDate = (val: Date | string) => {
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col my-auto animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold bg-blue-600 px-2.5 py-0.5 rounded text-white tracking-wide">
                  {complaint.complaintNumber}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDate(complaint.date)}
                </span>
              </div>
              <h3 id="detail-modal-title" className="text-base font-bold mt-1 text-slate-100">
                Detail Keluhan &ndash; {complaint.customerName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela detail"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition text-lg cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Status Bar */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <StatusBadge status={complaint.status} verifications={complaint.verifications} />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Saluran:</span>
              <span className="font-semibold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {complaint.source}
              </span>
            </div>
          </div>

          {/* Lifecycle Timeline */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Siklus Hidup Tiket:
            </span>
            <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-semibold">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                1. Dicatat
              </div>
              <div
                className={`p-1.5 rounded-lg border ${
                  complaint.status !== "BELUM_DITANGANI"
                    ? "bg-sky-100 text-sky-900 border-sky-300"
                    : "bg-slate-100 text-slate-400 border-slate-200"
                }`}
              >
                2. PIC
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
                4. Selesai
              </div>
            </div>
          </div>

          {/* Pelapor & PIC Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pelapor */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nama Pelapor / Pengguna
                </span>
                {complaint.daopOrStation && (
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 truncate max-w-[150px]">
                    {complaint.daopOrStation}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-slate-900">{complaint.customerName}</p>

              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Kontak / WhatsApp:</span>
                {complaint.customerContact ? (
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="font-mono text-xs text-slate-800 font-semibold">
                      {complaint.customerContact}
                    </span>
                    <a
                      href={`https://wa.me/${complaint.customerContact.replace(/[^0-9]/g, "")}`}
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

              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                Tanggal Laporan: {formatDate(complaint.date)}
              </p>
            </div>

            {/* Petugas PIC */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Petugas PIC Penanggung Jawab
              </span>
              {complaint.pic ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">{complaint.pic.name}</p>
                  <p className="text-xs text-slate-500">
                    {complaint.pic.email} &bull; ({complaint.pic.role})
                  </p>
                  {complaint.submittedAt && (
                    <p className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded inline-block font-medium">
                      Diajukan Verifikasi: {formatDate(complaint.submittedAt)}
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
              Uraian Lengkap Masalah / Keluhan:
            </span>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
              {complaint.description}
            </div>
          </div>

          {/* Hasil Penanganan PIC */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Hasil Tindakan Penanganan PIC
              </span>
              {complaint.submittedAt && (
                <span className="text-[10px] text-slate-400 font-mono">
                  Waktu Submit: {formatDate(complaint.submittedAt)}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <span className="text-[11px] font-bold text-slate-700">
                  Tindakan Perbaikan (Corrective Action):
                </span>
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {complaint.correctiveAction || (
                    <span className="text-slate-400 italic">Belum ada tindakan perbaikan yang dicatat oleh PIC.</span>
                  )}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <span className="text-[11px] font-bold text-slate-700">
                  Tindakan Pencegahan (Preventive Action):
                </span>
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {complaint.preventiveAction || (
                    <span className="text-slate-400 italic">Belum ada tindakan pencegahan yang dicatat.</span>
                  )}
                </p>
              </div>

              {/* Foto Bukti */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">
                    Foto Bukti Hasil Perbaikan:
                  </span>
                  {complaint.proofImageUrl && (
                    <a
                      href={complaint.proofImageUrl}
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
                {complaint.proofImageUrl ? (
                  <div className="relative w-full max-h-56 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={complaint.proofImageUrl}
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

              {complaint.notes && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-[11px] font-bold text-slate-700">
                    Catatan Tambahan:
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {complaint.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Riwayat Verifikasi */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Riwayat Verifikasi:
            </span>
            {complaint.verifications && complaint.verifications.length > 0 ? (
              <div className="space-y-2">
                {complaint.verifications.map((v) => (
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
                            ? "text-emerald-800 flex items-center gap-1"
                            : "text-rose-800 flex items-center gap-1"
                        }
                      >
                        <span>{v.result === VerificationResult.APPROVED ? "✓ Disetujui (Approved)" : "⚠️ Ditolak (Rejected)"}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDate(v.verifiedAt)}
                      </span>
                    </div>
                    {v.feedback && (
                      <p className="mt-1 text-slate-700 italic bg-white/70 p-2 rounded-lg border border-slate-200/50">
                        &ldquo;{v.feedback}&rdquo;
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      Verifikator: {v.verifier.name} ({v.verifier.role})
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400 italic">
                Belum ada catatan verifikasi untuk tiket ini.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          {complaint.status === "TERVERIFIKASI" ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium">
              <span>🔒</span> Terverifikasi &amp; Terkunci
            </span>
          ) : isReadOnly ? (
            <span className="text-xs text-slate-500 italic px-2 py-1">
              Mode Baca Saja
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEditMode(complaint);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Buka Tindak Lanjut / Edit</span>
            </button>
          )}

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
