"use client";

import React, { useState } from "react";
import { ComplaintData } from "@/components/DashboardClient";
import { createDocumentBatch } from "@/app/actions/complaints";
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
  // Hanya ambil keluhan yang sudah TERVERIFIKASI sebagai pilihan default
  const verifiedComplaints = complaints.filter((c) => c.status === "TERVERIFIKASI");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    verifiedComplaints.length > 0
      ? verifiedComplaints.map((c) => c.id)
      : complaints.slice(0, 5).map((c) => c.id)
  );

  const [docNumber, setDocNumber] = useState(
    `FR.SM/TI/033.001/10-${new Date().getFullYear()}`
  );
  const [managementRep, setManagementRep] = useState("Ir. Bambang Triyono (MR)");
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedList = complaints.filter((c) => selectedIds.includes(c.id));

  const handlePrint = () => {
    window.print();
  };

  const handleSaveBatch = async () => {
    if (selectedIds.length === 0) return;
    setIsSaving(true);
    await createDocumentBatch({
      complaintIds: selectedIds,
      documentNumber: docNumber,
      managementRep,
    });
    setIsSaving(false);
    handlePrint();
  };

  const handleDownloadPdf = async () => {
    if (selectedIds.length === 0) return;
    setIsDownloading(true);
    try {
      await createDocumentBatch({
        complaintIds: selectedIds,
        documentNumber: docNumber,
        managementRep,
      });

      const { pdf } = await import("@react-pdf/renderer");
      const { KaiDocumentPdf } = await import("@/components/pdf/KaiDocumentPdf");

      const blob = await pdf(
        <KaiDocumentPdf
          complaints={selectedList}
          documentNumber={docNumber}
          managementRep={managementRep}
          creatorName={currentUser.name || "Administrator KAI"}
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
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (val: Date | string) => {
    const d = new Date(val);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6 max-h-[95vh]">
        {/* Modal Top Header (Screen Only) */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <Image src="/kai-logo.png" alt="KAI Logo" width={80} height={28} className="h-7 w-auto bg-white p-1 rounded-md object-contain" unoptimized />
            <div>
              <h3 className="text-base font-bold">
                Generator Dokumen Resmi Kendali Mutu FR.SM/TI/033.001
              </h3>
              <p className="text-xs text-slate-400">
                Pilih keluhan untuk dibundel menjadi dokumen PDF laporan resmi KAI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isPreview ? (
              <button
                onClick={() => setIsPreview(true)}
                disabled={selectedIds.length === 0}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Pratinjau Dokumen Cetak &rarr;
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsPreview(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition"
                >
                  &larr; Pilih Keluhan Lain
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloading || isSaving}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Unduh berkas PDF resmi KAI secara langsung"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {isDownloading ? "Membuat PDF..." : "Unduh PDF (React-PDF)"}
                </button>
                <button
                  onClick={handleSaveBatch}
                  disabled={isSaving || isDownloading}
                  className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Cetak via dialog browser"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  {isSaving ? "Menyimpan..." : "Cetak Browser"}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition text-lg"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100/50">
          {!isPreview ? (
            /* TABEL PEMILIHAN KELUHAN */
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pengaturan Nomor Dokumen & Pejabat Penandatangan
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Nomor Dokumen Mutu
                    </label>
                    <input
                      type="text"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-slate-50/50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Nama Management Representative (Mengetahui)
                    </label>
                    <input
                      type="text"
                      value={managementRep}
                      onChange={(e) => setManagementRep(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-slate-50/50"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Pilih Keluhan yang Akan Dicantumkan ({selectedIds.length} dipilih)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Disarankan mencantumkan keluhan yang telah <b>Terverifikasi</b>.
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] uppercase font-semibold text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 w-10 text-center">Pilih</th>
                        <th className="px-4 py-3">No. Tiket</th>
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
                                className="rounded text-blue-900 focus:ring-blue-600 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">
                              {item.complaintNumber}
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
          ) : (
            /* ======================================================== */
            /* PRATINJAU DOKUMEN SESUAI FORMAT BAKU KAI FR.SM/TI/033.001 */
            /* ======================================================== */
            <div className="bg-white p-8 sm:p-12 rounded-xl shadow-lg border border-slate-300 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900 font-sans">
              {/* Kop Surat / Header Dokumen Resmi KAI */}
              <div className="border-b-2 border-slate-800 pb-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Image src="/kai-logo.png" alt="KAI Logo" width={120} height={40} className="h-10 w-auto object-contain" unoptimized />
                    <div>
                      <h1 className="text-base font-extrabold tracking-tight text-slate-900 uppercase">
                        PT KERETA API INDONESIA (PERSERO)
                      </h1>
                      <p className="text-xs text-slate-600 font-medium">
                        Sistem Penanganan dan Dokumentasi Keluhan Pelanggan
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-mono border-l-2 border-slate-300 pl-4">
                    <p className="font-bold text-slate-900">No. Dokumen: {docNumber}</p>
                    <p className="text-slate-600">Edisi / Versi: 002-2020</p>
                    <p className="text-slate-600">Tanggal: {formatDate(new Date())}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 text-center">
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    REKAPITULASI PENGELOLAAN & PENANGANAN KELUHAN PELANGGAN
                  </h2>
                </div>
              </div>

              {/* Tabel Data Rekapitulasi */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse border border-slate-400">
                  <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-800">
                    <tr>
                      <th className="border border-slate-400 p-2 text-center w-8">No</th>
                      <th className="border border-slate-400 p-2 w-24">No. Keluhan</th>
                      <th className="border border-slate-400 p-2 w-28">Pelapor / Sumber</th>
                      <th className="border border-slate-400 p-2">Uraian Keluhan</th>
                      <th className="border border-slate-400 p-2">Tindakan Perbaikan & Pencegahan</th>
                      <th className="border border-slate-400 p-2 w-24 text-center">Hasil Verifikasi</th>
                      <th className="border border-slate-400 p-2 w-20">PIC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 text-[11px]">
                    {selectedList.map((item, idx) => (
                      <tr key={item.id} className="align-top">
                        <td className="border border-slate-400 p-2 text-center font-medium">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-400 p-2 font-mono font-bold">
                          {item.complaintNumber}
                          <div className="text-[10px] font-normal text-slate-500 font-sans mt-0.5">
                            {formatDate(item.date)}
                          </div>
                        </td>
                        <td className="border border-slate-400 p-2 font-medium">
                          {item.customerName}
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Sumber: {item.source}
                          </div>
                        </td>
                        <td className="border border-slate-400 p-2 text-slate-700 leading-relaxed">
                          {item.description}
                        </td>
                        <td className="border border-slate-400 p-2 space-y-1">
                          {item.correctiveAction ? (
                            <div>
                              <span className="font-bold text-[10px] text-slate-800 uppercase block">
                                Perbaikan:
                              </span>
                              <span>{item.correctiveAction}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Belum ada tindakan</span>
                          )}
                          {item.preventiveAction && (
                            <div className="pt-1 border-t border-slate-200">
                              <span className="font-bold text-[10px] text-slate-800 uppercase block">
                                Pencegahan:
                              </span>
                              <span>{item.preventiveAction}</span>
                            </div>
                          )}
                        </td>
                        <td className="border border-slate-400 p-2 text-center">
                          <span
                            className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${
                              item.status === "TERVERIFIKASI"
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                : "bg-amber-100 text-amber-900 border border-amber-300"
                            }`}
                          >
                            {item.status === "TERVERIFIKASI" ? "Disetujui" : item.status}
                          </span>
                        </td>
                        <td className="border border-slate-400 p-2 text-slate-800 font-medium">
                          {item.pic ? item.pic.name : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Kolom Tanda Tangan Resmi KAI */}
              <div className="mt-12 pt-6 grid grid-cols-2 gap-8 text-center text-xs break-inside-avoid">
                <div>
                  <p className="text-slate-600 mb-1">Dibuat Oleh / Pelaksana:</p>
                  <p className="font-semibold text-slate-800">Petugas Pengelola SPKP</p>
                  <div className="h-16 flex items-end justify-center">
                    <p className="font-bold text-slate-900 underline underline-offset-4">
                      {currentUser.name || "Administrator KAI"}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Tanggal: {formatDate(new Date())}</p>
                </div>

                <div>
                  <p className="text-slate-600 mb-1">Mengetahui:</p>
                  <p className="font-semibold text-slate-800">Management Representative (MR)</p>
                  <div className="h-16 flex items-end justify-center">
                    <p className="font-bold text-slate-900 underline underline-offset-4">
                      {managementRep}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Tanggal: {formatDate(new Date())}</p>
                </div>
              </div>

              {/* Footer Dokumen KAI */}
              <div className="mt-10 pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Dokumen Standar FR.SM/TI/033.001 - PT Kereta Api Indonesia (Persero)</span>
                <span>Halaman 1 dari 1</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
