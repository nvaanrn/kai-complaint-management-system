"use client";

import React, { useEffect } from "react";

interface ToastNotificationProps {
  toast: { message: string; type: "success" | "error" } | null;
  onClose: () => void;
}

export default function ToastNotification({ toast, onClose }: ToastNotificationProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold border ${
          toast.type === "success"
            ? "bg-slate-900 text-white border-slate-800"
            : "bg-rose-900 text-white border-rose-800"
        }`}
      >
        <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
        <span>{toast.message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup notifikasi"
          className="ml-2 text-slate-400 hover:text-white text-sm"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
