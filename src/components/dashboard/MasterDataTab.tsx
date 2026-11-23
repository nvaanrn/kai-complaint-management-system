"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import HolidayManager from "./HolidayManager";
import { HolidayItem } from "@/lib/holidayRules";
import {
  createMasterItem,
  updateMasterItem,
  deleteMasterItem,
} from "@/app/actions/masterData";
import {
  MasterDataLists,
  MasterItem,
  MasterKind,
  MASTER_LABELS,
  MASTER_NAME_MAX_LENGTH,
  SLA_HOURS_MIN,
  SLA_HOURS_MAX,
  isProtectedMasterItem,
} from "@/lib/masterDataRules";

interface MasterDataTabProps {
  masterData: MasterDataLists;
  holidays?: HolidayItem[];
  onNotify: (message: string, type?: "success" | "error") => void;
}

const TABS: { kind: MasterKind; key: keyof MasterDataLists }[] = [
  { kind: "area", key: "areas" },
  { kind: "category", key: "categories" },
  { kind: "source", key: "sources" },
];

export default function MasterDataTab({ masterData, holidays = [], onNotify }: MasterDataTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [kind, setKind] = useState<MasterKind>("area");
  const [showHolidays, setShowHolidays] = useState(false);
  const [form, setForm] = useState<{ mode: "create" | "edit"; item?: MasterItem } | null>(null);
  const [name, setName] = useState("");
  const [slaHours, setSlaHours] = useState("24");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<MasterItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = () => startTransition(() => router.refresh());
  const activeTab = TABS.find((t) => t.kind === kind) ?? TABS[0];
  const items = masterData[activeTab.key];

  const openCreate = () => {
    setName("");
    setSlaHours("24");
    setDescription("");
    setFormError("");
    setForm({ mode: "create" });
  };

  const openEdit = (item: MasterItem) => {
    setName(item.name);
    setSlaHours(String(item.slaHours ?? 24));
    setDescription(item.description ?? "");
    setFormError("");
    setForm({ mode: "edit", item });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setFormError("");
    try {
      const payload =
        kind === "category"
          ? { name, slaHours: Number(slaHours), description }
          : { name };
      const res =
        form.mode === "create"
          ? await createMasterItem(kind, payload)
          : await updateMasterItem(kind, form.item!.id, payload);

      if (!res.success) {
        setFormError(res.error || "Gagal menyimpan data.");
        return;
      }
      onNotify(res.message || "Data berhasil disimpan.");
      setForm(null);
      refresh();
    } catch (err: any) {
      setFormError(err?.message || "Terjadi kesalahan sistem.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: MasterItem) => {
    const res = await updateMasterItem(kind, item.id, { isActive: !item.isActive });
    if (!res.success) {
      onNotify(res.error || "Gagal mengubah status.", "error");
      return;
    }
    onNotify(item.isActive ? "Data dinonaktifkan." : "Data diaktifkan kembali.");
    refresh();
  };

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await deleteMasterItem(kind, toDelete.id);
      if (!res.success) {
        onNotify(res.error || "Gagal menghapus data.", "error");
        return;
      }
      onNotify(res.message || "Data berhasil dihapus.");
      setToDelete(null);
      refresh();
    } finally {
      setDeleting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 bg-white";

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Setting &bull; Master Data
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Kelola isi pilihan (dropdown) pada form keluhan dan daftar hari libur untuk SLA. Data yang sudah dipakai keluhan tidak
          dihapus permanen, tetapi dinonaktifkan agar riwayat tetap utuh. Daftar PIC mengikuti
          akun pengguna berperan PIC dan dikelola di menu Manajemen User.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.kind}
                type="button"
                onClick={() => {
                  setKind(t.kind);
                  setShowHolidays(false);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  !showHolidays && kind === t.kind
                    ? "bg-blue-900 text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {MASTER_LABELS[t.kind]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowHolidays(true)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                showHolidays
                  ? "bg-blue-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Hari Libur
            </button>
          </div>
          {!showHolidays && (
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-md cursor-pointer self-start sm:self-auto"
            >
              + Tambah {MASTER_LABELS[kind]}
            </button>
          )}
        </div>

        {showHolidays ? (
          <HolidayManager holidays={holidays} onNotify={onNotify} />
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Nama</th>
                {kind === "category" && <th className="px-4 py-3">Target SLA</th>}
                <th className="px-4 py-3">Dipakai</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Belum ada data. Klik tombol tambah untuk membuat data pertama.
                  </td>
                </tr>
              )}
              {items.map((item) => {
                const locked = isProtectedMasterItem(kind, item.name);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.name}
                      {locked && (
                        <span className="ml-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          Bawaan sistem
                        </span>
                      )}
                      {kind === "category" && item.description && (
                        <p className="text-[11px] font-normal text-slate-500 mt-0.5">{item.description}</p>
                      )}
                    </td>
                    {kind === "category" && (
                      <td className="px-4 py-3 text-slate-700">{item.slaHours} jam kerja</td>
                    )}
                    <td className="px-4 py-3 text-slate-700">{item.usageCount} keluhan</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {item.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                        >
                          Ubah
                        </button>
                        {!locked && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item)}
                            disabled={isPending}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer disabled:opacity-50"
                          >
                            {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        )}
                        {!locked && (
                          <button
                            type="button"
                            onClick={() => setToDelete(item)}
                            className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-medium cursor-pointer"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Modal tambah / ubah */}
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
              {form.mode === "create" ? "Tambah" : "Ubah"} {MASTER_LABELS[kind]}
            </h3>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                maxLength={MASTER_NAME_MAX_LENGTH}
                disabled={form.mode === "edit" && !!form.item && isProtectedMasterItem(kind, form.item.name)}
                onChange={(e) => setName(e.target.value)}
                className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`}
                autoFocus
              />
            </div>

            {kind === "category" && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target SLA (jam kerja) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={SLA_HOURS_MIN}
                    max={SLA_HOURS_MAX}
                    step={1}
                    value={slaHours}
                    onChange={(e) => setSlaHours(e.target.value)}
                    className={inputClass}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Perubahan target hanya berlaku untuk keluhan baru. Keluhan lama tetap memakai target saat dicatat.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Deskripsi <span className="text-slate-400 font-normal lowercase">(opsional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </>
            )}

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
                disabled={saving || !name.trim()}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal konfirmasi hapus */}
      {toDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Hapus &ldquo;{toDelete.name}&rdquo;?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {toDelete.usageCount > 0
                ? `Data ini sudah dipakai ${toDelete.usageCount} keluhan, sehingga tidak akan dihapus permanen. Sistem hanya menonaktifkannya: tidak muncul lagi di form baru, tetapi riwayat keluhan tetap utuh.`
                : "Data ini belum pernah dipakai keluhan, sehingga akan dihapus permanen."}
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
                {deleting ? "Memproses..." : toDelete.usageCount > 0 ? "Nonaktifkan" : "Hapus Permanen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
