"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHoliday, updateHoliday, deleteHoliday } from "@/app/actions/holidays";
import {
  HolidayItem,
  HOLIDAY_NAME_MAX_LENGTH,
  formatHolidayDate,
  isWeekendKey,
} from "@/lib/holidayRules";

interface HolidayManagerProps {
  holidays: HolidayItem[];
  onNotify: (message: string, type?: "success" | "error") => void;
}

export default function HolidayManager({ holidays, onNotify }: HolidayManagerProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());

  const years = useMemo(
    () => Array.from(new Set(holidays.map((h) => h.date.slice(0, 4)))).sort(),
    [holidays]
  );
  const [year, setYear] = useState<string>("all");
  const visible = year === "all" ? holidays : holidays.filter((h) => h.date.startsWith(year));

  const [form, setForm] = useState<{ mode: "create" | "edit"; item?: HolidayItem } | null>(null);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<HolidayItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setDate("");
    setName("");
    setFormError("");
    setForm({ mode: "create" });
  };

  const openEdit = (item: HolidayItem) => {
    setDate(item.date);
    setName(item.name);
    setFormError("");
    setForm({ mode: "edit", item });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setFormError("");
    try {
      const res =
        form.mode === "create"
          ? await createHoliday({ date, name })
          : await updateHoliday(form.item!.id, { date, name });
      if (!res.success) {
        setFormError(res.error || "Gagal menyimpan hari libur.");
        return;
      }
      onNotify(res.message || "Hari libur berhasil disimpan.");
      setForm(null);
      refresh();
    } catch (err: any) {
      setFormError(err?.message || "Terjadi kesalahan sistem.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await deleteHoliday(toDelete.id);
      if (!res.success) {
        onNotify(res.error || "Gagal menghapus hari libur.", "error");
        return;
      }
      onNotify(res.message || "Hari libur berhasil dihapus.");
      setToDelete(null);
      refresh();
    } finally {
      setDeleting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 bg-white";

  return (
    <div>
      <div className="px-4 py-3 bg-sky-50 border-b border-sky-100 text-[11px] text-sky-900 leading-relaxed">
        Hari libur nasional dan cuti bersama tidak dihitung sebagai hari kerja pada tenggat SLA. Perubahan
        daftar ini hanya berlaku untuk keluhan yang dicatat sesudahnya; tenggat keluhan yang sudah tercatat
        tidak berubah.
      </div>

      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Tahun</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white"
          >
            <option value="all">Semua</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-md cursor-pointer self-start sm:self-auto"
        >
          + Tambah Hari Libur
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Keterangan</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  Belum ada hari libur terdaftar. Tanpa data libur, SLA hanya melewati akhir pekan.
                </td>
              </tr>
            )}
            {visible.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                  {formatHolidayDate(item.date)}
                  {isWeekendKey(item.date) && (
                    <span className="ml-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      Akhir pekan
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{item.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => setToDelete(item)}
                      className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-medium cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900">
              {form.mode === "create" ? "Tambah" : "Ubah"} Hari Libur
            </h3>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tanggal <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
              {date && /^\d{4}-\d{2}-\d{2}$/.test(date) && (
                <p className="text-[11px] text-slate-500 mt-1">
                  {formatHolidayDate(date)}
                  {isWeekendKey(date) ? " (akhir pekan, sudah bukan hari kerja)" : ""}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Keterangan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                maxLength={HOLIDAY_NAME_MAX_LENGTH}
                placeholder="Contoh: Hari Raya Natal"
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || !date || !name.trim()}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {toDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Hapus hari libur?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {formatHolidayDate(toDelete.date)} &mdash; {toDelete.name}. Tanggal ini akan dihitung lagi sebagai
              hari kerja untuk keluhan yang dicatat sesudahnya. Tenggat keluhan yang sudah tercatat tidak berubah.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-600 rounded-xl transition shadow-md disabled:opacity-40 cursor-pointer"
              >
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
