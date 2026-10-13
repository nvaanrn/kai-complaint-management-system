"use client";

import React, { useState } from "react";
import { ComplaintData } from "@/components/DashboardClient";
import { createDocumentBatch } from "@/app/actions/complaints";
import { exportComplaintsToExcel } from "@/lib/exportExcel";
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
  const [docVersion, setDocVersion] = useState(() => {
    const yyyy = new Date().getFullYear();
    return `002-${yyyy}`;
  });
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

  const selectAll = () => {
    setSelectedIds(complaints.map((c) => c.id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const selectedList = complaints.filter((c) => selectedIds.includes(c.id));

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcelFromModal = () => {
    exportComplaintsToExcel(selectedList, {
      documentNumber: docNumber,
      documentDate: docDate,
      version: docVersion,
      filenamePrefix: `FR_SM_TI_033_001_${docNumber.replace(/[\/\\:]/g, "-")}`,
    });
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
          documentDate={docDate}
          version={docVersion}
          managementRep={managementRep}
          creatorName={currentUser.name || "Administrator KAI"}
          logoUrl={window.location.origin + "/kai-logo.png"}
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

  const formatItemDate = (val: Date | string) => {
    const d = new Date(val);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-7xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-4 max-h-[96vh]">
        {/* Modal Top Bar (Screen Only) */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
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
              </h3>
              <p className="text-xs text-slate-400">
                Pengelolaan dan Penanganan Keluhan Pelanggan PT Kereta Api Indonesia (Persero)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isPreview ? (
              <button
                onClick={() => setIsPreview(true)}
                disabled={selectedIds.length === 0}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition cursor-pointer disabled:opacity-50 shadow-xs"
              >
                Pratinjau Format Baku &rarr;
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsPreview(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-xl transition"
                >
                  &larr; Ubah Pilihan
                </button>
                <button
                  onClick={handleExportExcelFromModal}
                  disabled={selectedList.length === 0}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-100 bg-emerald-700 hover:bg-emerald-600 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Unduh format spreadsheet Excel persis formulir KAI (.xlsx)"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Ekspor Excel (.xlsx)</span>
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloading || isSaving || selectedList.length === 0}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-600 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Unduh berkas PDF resmi KAI"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>{isDownloading ? "Memproses PDF..." : "Unduh PDF"}</span>
                </button>
                <button
                  onClick={handleSaveBatch}
                  disabled={isSaving || isDownloading || selectedList.length === 0}
                  className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Cetak via browser"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>{isSaving ? "Menyimpan..." : "Cetak"}</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition text-lg cursor-pointer ml-1"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60">
          {!isPreview ? (
            /* TABEL PEMILIHAN KELUHAN & PENGATURAN METADATA */
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Pengaturan Header Formulir FR.SM/TI/033.001
                  </h4>
                  <button
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      No. Dokumen
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
                      Tanggal Dokumen
                    </label>
                    <input
                      type="text"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Versi Dokumen
                    </label>
                    <input
                      type="text"
                      value={docVersion}
                      onChange={(e) => setDocVersion(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-slate-50/50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Management Representative (MR)
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
                <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Pilih Keluhan ({selectedIds.length} dari {complaints.length} dipilih)
                    </span>
                    <span className="text-[11px] text-slate-400 block sm:inline sm:ml-2">
                      Sesuai standar ISO KAI, diutamakan keluhan yang berstatus <b>TERVERIFIKASI</b>.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={deselectAll}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Batal Pilih
                    </button>
                  </div>
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
          ) : (
            /* ======================================================== */
            /* PRATINJAU DOKUMEN BAKU PERSIS SESUAI GAMBAR ACUAN KAI     */
            /* ======================================================== */
            <div className="bg-white p-4 sm:p-8 rounded-xl shadow-lg border border-slate-300 w-full overflow-x-auto print:overflow-visible print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900 font-sans">
              <div className="min-w-[1050px] print:min-w-0 print:w-full print:text-[10px]">
                {/* 1. KOP / HEADER BAKU KAI 3-BAGIAN */}
                <div className="border border-black mb-3">
                  <div className="grid grid-cols-12 divide-x divide-black">
                    {/* Kolom Kiri: Logo KAI & Badge TERBATAS */}
                    <div className="col-span-2 flex flex-col items-center justify-between p-2 divide-y divide-black">
                      <div className="h-14 flex items-center justify-center w-full pb-2">
                        <Image
                          src="/kai-logo.png"
                          alt="KAI Logo"
                          width={110}
                          height={40}
                          className="h-10 w-auto object-contain"
                          unoptimized
                        />
                      </div>
                      <div className="w-full pt-2 flex items-center justify-center">
                        <div className="border-2 border-yellow-400 px-3 py-1 text-center w-full bg-white shadow-2xs">
                          <span className="text-yellow-500 font-black text-xs tracking-widest block">
                            TERBATAS
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Kolom Tengah: Judul Resmi Dokumen */}
                    <div className="col-span-7 flex flex-col justify-between text-center divide-y divide-black">
                      <div className="py-2.5 px-3">
                        <h1 className="text-sm font-black tracking-wide text-black uppercase">
                          PT KERETA API INDONESIA(PERSERO)
                        </h1>
                        <h2 className="text-xs font-bold tracking-wider text-black uppercase mt-0.5">
                          SISTEM INFORMASI
                        </h2>
                      </div>
                      <div className="py-3 px-3 flex-1 flex items-center justify-center">
                        <h3 className="text-xs sm:text-sm font-black tracking-wide text-black uppercase">
                          DOKUMENTASI PENGELOLAAN DAN PENANGANAN KELUHAN PELANGGAN
                        </h3>
                      </div>
                    </div>

                    {/* Kolom Kanan: Kotak Metadata Dokumen */}
                    <div className="col-span-3 text-[11px] font-sans divide-y divide-black">
                      <div className="grid grid-cols-12 divide-x divide-black py-1">
                        <span className="col-span-5 px-2 font-medium">No. Dokumen</span>
                        <span className="col-span-7 px-2 font-mono font-medium">: {docNumber}</span>
                      </div>
                      <div className="grid grid-cols-12 divide-x divide-black py-1">
                        <span className="col-span-5 px-2 font-medium">Tanggal</span>
                        <span className="col-span-7 px-2 font-medium">: {docDate}</span>
                      </div>
                      <div className="grid grid-cols-12 divide-x divide-black py-1">
                        <span className="col-span-5 px-2 font-medium">Versi</span>
                        <span className="col-span-7 px-2 font-mono font-medium">: {docVersion}</span>
                      </div>
                      <div className="grid grid-cols-12 divide-x divide-black py-1">
                        <span className="col-span-5 px-2 font-medium">Halaman</span>
                        <span className="col-span-7 px-2 font-medium">: 1</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. TABEL REKAPITULASI DENGAN HEADER BERTINGKAT & TEKS MERAH */}
                <table className="w-full text-left text-[11px] border-collapse border border-black">
                  <thead>
                    {/* Header Baris 1 */}
                    <tr className="bg-white text-black font-bold text-center border-b border-black">
                      <th rowSpan={2} className="border border-black px-2 py-2 w-8 align-middle">
                        No
                      </th>
                      <th rowSpan={2} className="border border-black px-2 py-2 w-24 align-middle">
                        Tanggal
                      </th>
                      <th rowSpan={2} className="border border-black px-2 py-2 w-32 align-middle">
                        Pelanggan
                      </th>
                      <th rowSpan={2} className="border border-black px-2 py-2 w-24 align-middle">
                        Sumber
                      </th>
                      <th rowSpan={2} className="border border-black px-2 py-2 w-52 align-middle">
                        Deskripsi Keluhan
                      </th>
                      <th rowSpan={2} className="border border-black px-2 py-2 w-56 align-middle">
                        Tindakan perbaikan dan pencegahan yang diambil
                      </th>
                      <th colSpan={3} className="border border-black px-2 py-1.5 align-middle">
                        Verification
                      </th>
                      <th rowSpan={2} className="border border-black px-2 py-2 w-32 align-middle">
                        Keterangan
                      </th>
                    </tr>

                    {/* Header Baris 2 (Sub-kolom Verification) */}
                    <tr className="bg-white text-black font-bold text-center border-b border-black">
                      <th className="border border-black px-2 py-1 w-20 align-middle">Tgl</th>
                      <th className="border border-black px-2 py-1 w-24 align-middle">PIC</th>
                      <th className="border border-black px-2 py-1 w-20 align-middle">Hasil</th>
                    </tr>


                  </thead>

                  {/* Data Rows */}
                  <tbody className="divide-y divide-black text-black">
                    {selectedList.map((item, idx) => {
                      const formattedDate = formatItemDate(item.date);
                      const verificationDate =
                        item.verifications && item.verifications.length > 0
                          ? formatItemDate(item.verifications[0].verifiedAt)
                          : item.submittedAt
                          ? formatItemDate(item.submittedAt)
                          : "-";

                      const picName = item.pic?.name || (item.picId ? "Petugas PIC" : "-");
                      const verificationResult =
                        item.status === "TERVERIFIKASI"
                          ? (item.verifications && item.verifications.length > 0 && item.verifications[0].feedback ? item.verifications[0].feedback : "Disetujui")
                          : item.status;

                      return (
                        <tr key={item.id} className="align-top hover:bg-slate-50">
                          <td className="border border-black p-2 text-center font-medium">
                            {idx + 1}
                          </td>
                          <td className="border border-black p-2 text-center whitespace-nowrap">
                            {formattedDate}
                          </td>
                          <td className="border border-black p-2">
                            <span className="font-semibold block">{item.customerName}</span>
                            {item.daopOrStation && (
                              <span className="text-[10px] text-slate-500 block">
                                {item.daopOrStation}
                              </span>
                            )}
                            {item.customerContact && (
                              <span className="text-[10px] text-slate-500 block">
                                {item.customerContact}
                              </span>
                            )}
                          </td>
                          <td className="border border-black p-2">{item.source}</td>
                          <td className="border border-black p-2 leading-relaxed">
                            {item.description}
                          </td>
                          <td className="border border-black p-2 space-y-1">
                            {item.correctiveAction ? (
                              <div>
                                <span className="font-bold text-[10px] uppercase block text-slate-700">
                                  Perbaikan:
                                </span>
                                <span>{item.correctiveAction}</span>
                              </div>
                            ) : null}
                            {item.preventiveAction ? (
                              <div className={item.correctiveAction ? "pt-1 border-t border-slate-200" : ""}>
                                <span className="font-bold text-[10px] uppercase block text-slate-700">
                                  Pencegahan:
                                </span>
                                <span>{item.preventiveAction}</span>
                              </div>
                            ) : null}
                            {!item.correctiveAction && !item.preventiveAction && (
                              <span className="text-slate-400 italic">Belum ada tindakan</span>
                            )}
                          </td>
                          <td className="border border-black p-2 text-center whitespace-nowrap">
                            {verificationDate}
                          </td>
                          <td className="border border-black p-2 text-center font-medium">
                            {picName}
                          </td>
                          <td className="border border-black p-2 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase inline-block ${
                                item.status === "TERVERIFIKASI"
                                  ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                  : "bg-slate-100 text-slate-800"
                              }`}
                            >
                              {verificationResult}
                            </span>
                          </td>
                          <td className="border border-black p-2 font-mono text-[10px]">
                            <div className="font-bold text-slate-900">{item.complaintNumber}</div>
                            {item.notes && <div className="text-slate-600 mt-0.5">{item.notes}</div>}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Jika keluhan kurang dari 4 baris, tampilkan baris kosong agar menyerupai lembar formulir baku di gambar */}
                    {selectedList.length < 4 &&
                      Array.from({ length: 4 - selectedList.length }).map((_, i) => (
                        <tr key={`empty-${i}`} className="h-9">
                          <td className="border border-black p-2 text-center text-slate-300">
                            {selectedList.length + i + 1}
                          </td>
                          <td className="border border-black p-2"></td>
                          <td className="border border-black p-2"></td>
                          <td className="border border-black p-2"></td>
                          <td className="border border-black p-2"></td>
                          <td className="border border-black p-2"></td>
                          <td className="border border-black p-2"></td>
                          <td className="border border-black p-2"></td>
                          <td className="border border-black p-2"></td>
                          <td className="border border-black p-2"></td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {/* 3. TANDA TANGAN RESMI KAI */}
                <div className="mt-8 pt-4 grid grid-cols-2 gap-8 text-center text-xs break-inside-avoid">
                  <div>
                    <p className="text-slate-600 mb-1">Dibuat Oleh (Pelaksana SPKP):</p>
                    <p className="font-semibold text-slate-800">Petugas Pengelola SPKP</p>
                    <div className="h-16 flex items-end justify-center">
                      <p className="font-bold text-slate-900 underline underline-offset-4">
                        {currentUser.name || "Administrator KAI"}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Tanggal: {docDate}</p>
                  </div>

                  <div>
                    <p className="text-slate-600 mb-1">Mengetahui:</p>
                    <p className="font-semibold text-slate-800">Management Representative (MR)</p>
                    <div className="h-16 flex items-end justify-center">
                      <p className="font-bold text-slate-900 underline underline-offset-4">
                        {managementRep}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Tanggal: {docDate}</p>
                  </div>
                </div>

                {/* 4. FOOTER RESMI KAI */}
                <div className="mt-8 pt-3 border-t border-black flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Formulir Baku FR.SM/TI/033.001 - PT Kereta Api Indonesia (Persero)</span>
                  <span>Edisi: {docVersion}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
