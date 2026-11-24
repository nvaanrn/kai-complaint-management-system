"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { UserSummary, Role } from "@/types/database";
import { MasterDataLists, buildSelectOptions, selectableCategories, formatSlaTarget } from "@/lib/masterDataRules";

interface ComplaintCreateModalProps {
  picList: UserSummary[];
  masterData: MasterDataLists;
  onClose: () => void;
  onSubmit: (data: {
    customerName: string;
    customerContact?: string;
    daopOrStation?: string;
    source: string;
    date: string;
    picId?: string;
    description: string;
    categoryId?: string;
  }) => Promise<void>;
  isLoading: boolean;
}
   // duplicate block removed

export default function ComplaintCreateModal({
  picList,
  masterData,
  onClose,
  onSubmit,
  isLoading,
}: ComplaintCreateModalProps) {
  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  // Pilihan dropdown berasal dari data master yang aktif (diatur Admin di Setting & Master Data)
  const areaOptions = buildSelectOptions(masterData.areas);
  const sourceOptions = buildSelectOptions(masterData.sources);
  const activeCategories = selectableCategories(masterData.categories);

  const [daopOrStation, setDaopOrStation] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [picId, setPicId] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const selectedCategory = activeCategories.find((cat) => cat.id === categoryId);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customerName.trim().length < 3) {
      setFormError("Nama personil / pelapor minimal 3 karakter.");
      return;
    }
    if (description.trim().length < 10) {
      setFormError("Uraian keluhan pelanggan minimal 10 karakter.");
      return;
    }

    if (!daopOrStation) {
      setFormError("Wilayah operasional wajib dipilih.");
      return;
    }
    if (!categoryId) {
      setFormError("Kategori keluhan wajib dipilih.");
      return;
    }
    if (!source) {
      setFormError("Sumber keluhan wajib dipilih.");
      return;
    }

    setFormError("");
    await onSubmit({
      customerName: customerName.trim(),
      customerContact: customerContact.trim() || undefined,
      daopOrStation,
      source,
      date,
      picId: picId || undefined,
      description: description.trim(),
      categoryId: categoryId || undefined,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col my-auto animate-in zoom-in-95 duration-150">
        {/* Pinned Header */}
        <div className="p-5 sm:p-6 bg-blue-900 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <Image
              src="/kai-logo.png"
              alt="KAI Logo"
              width={80}
              height={28}
              className="h-7 w-auto bg-white p-1 rounded object-contain"
              unoptimized
            />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                Formulir Registrasi Keluhan Pelanggan
              </span>
              <h3 id="create-modal-title" className="text-lg font-bold">
                Catat Keluhan Baru
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup formulir"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition text-lg cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 sm:p-7 space-y-4 overflow-y-auto flex-1">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                {formError}
              </div>
            )}

            {/* Nama Pelapor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Personil / Pelapor <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Budi Santoso (Penumpang KA Argo Parahyangan / Logistik)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 bg-white placeholder:text-slate-400"
              />
            </div>

            {/* Kontak Pelapor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kontak Pelapor / WhatsApp <span className="text-slate-400 font-normal lowercase">(opsional)</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: 0812-3456-7890"
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 bg-white placeholder:text-slate-400"
              />
            </div>

            {/* Wilayah / Daop (dari data master) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Wilayah Operasional / Daop <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={daopOrStation}
                onChange={(e) => setDaopOrStation(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 bg-white"
              >
                <option value="">-- Pilih wilayah operasional --</option>
                {areaOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Kategori Keluhan (dari data master) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kategori Keluhan <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 bg-white"
              >
                <option value="">-- Pilih kategori keluhan --</option>
                {activeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {selectedCategory && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Target SLA kategori ini: {formatSlaTarget(selectedCategory.slaHours)}.
                </p>
              )}
            </div>

            {/* Sumber Keluhan (dari data master) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sumber / Saluran Keluhan <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 bg-white"
              >
                <option value="">-- Pilih sumber keluhan --</option>
                {sourceOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tanggal Pelaporan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tanggal Pelaporan
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 bg-white"
              />
            </div>

            {/* Tugaskan PIC */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tugaskan Petugas PIC <span className="text-slate-400 font-normal lowercase">(opsional)</span>
              </label>
              <select
                value={picId}
                onChange={(e) => setPicId(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 bg-white"
              >
                <option value="">-- Belum Ditugaskan (Pilih Nanti) --</option>
                {picList
                  .filter((pic) => pic.role === Role.PIC)
                  .map((pic) => (
                    <option key={pic.id} value={pic.id}>
                      {pic.name} (PIC)
                    </option>
                  ))}
              </select>
            </div>

            {/* Uraian Keluhan */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Uraian Lengkap Keluhan / Masalah <span className="text-rose-500 font-bold">*</span>
                </label>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    description.trim().length === 0
                      ? "bg-rose-50 text-rose-600 border border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {description.trim().length === 0 ? "Wajib Diisi" : `${description.trim().length} karakter`}
                </span>
              </div>
              <textarea
                required
                rows={4}
                placeholder="Tuliskan secara lengkap rincian kendala fasilitas, layanan kereta, atau pelayanan pelanggan yang perlu diperbaiki..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 text-slate-900 resize-none transition ${
                  description.trim() === ""
                    ? "border-amber-300 focus:ring-amber-500 bg-amber-50/20"
                    : "border-slate-300 focus:ring-blue-600 bg-white"
                }`}
              />
            </div>
          </div>

          {/* Pinned Footer */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Pastikan nama pelapor dan uraian masalah terisi lengkap.
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isLoading || !description.trim() || !customerName.trim() || !source || !daopOrStation || !categoryId}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                {isLoading ? "Menyimpan Data..." : "Simpan Keluhan"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
