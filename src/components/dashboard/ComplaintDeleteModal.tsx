"use client";

import React, { useEffect } from "react";
import { ComplaintData } from "@/types/database";

interface ComplaintDeleteModalProps {
  complaint: ComplaintData;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
  isLoading: boolean;
}

export default function ComplaintDeleteModal({
  complaint,
  onClose,
  onConfirmDelete,
  isLoading,
}: ComplaintDeleteModalProps) {
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
      });
    } catch {
      return "-";
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-2xs">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>

          <div>
            <h3 id="delete-modal-title" className="text-base font-bold text-slate-900">
              Hapus Keluhan Pelanggan?
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Tindakan ini permanen. Seluruh riwayat penanganan, verifikasi, dan bukti fisik terkait akan dihapus dari sistem SPKP.
            </p>
          </div>

          {/* Card Ringkasan Keluhan */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-blue-900">
                {complaint.complaintNumber}
              </span>
              <span className="text-[11px] text-slate-400">
                {formatDate(complaint.date)}
              </span>
            </div>
            <p className="font-semibold text-slate-800">
              {complaint.customerName}
            </p>
            <p className="text-[11px] text-slate-500 line-clamp-2">
              {complaint.description}
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirmDelete}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {isLoading ? "Menghapus..." : "Hapus Keluhan"}
          </button>
        </div>
      </div>
    </div>
  );
}
