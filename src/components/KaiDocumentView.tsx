"use client";

import React from "react";
import { ComplaintData } from "@/types/database";

export interface KaiDocumentViewProps {
  complaints: ComplaintData[];
  documentNumber?: string;
  documentDate?: string;
  version?: string;
  managementRep?: string;
  creatorName?: string;
  pageInfo?: string;
  isPublished?: boolean;
}

export default function KaiDocumentView({
  complaints,
  documentNumber = "FR.SM/TI/033.001/10-2020",
  documentDate = "12 Oktober 2020",
  version = `001-${new Date().getFullYear()}`,
  managementRep = "Ir. Bambang Triyono (MR)",
  creatorName = "Petugas SPKP KAI",
  pageInfo = "1 dari 1",
  isPublished = false,
}: KaiDocumentViewProps) {
  const formatItemDate = (val: Date | string | null | undefined) => {
    if (!val) return "-";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  return (
    <div className="kai-document-printable bg-white text-black font-sans leading-tight select-text w-full max-w-[1100px] mx-auto p-4 sm:p-6 print:p-0 print:m-0 print:max-w-none print:w-full">
      {/* Status banner jika dokumen resmi terarsip */}
      {isPublished && (
        <div className="mb-3 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-[11px] font-semibold flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse"></span>
            <span>Dokumen Resmi Terbit (Terkunci sebagai Arsip Audit Mutu)</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700">Status: PUBLISHED</span>
        </div>
      )}

      {/* 1. KOP / HEADER BAKU KAI 3-BAGIAN */}
      <div className="kai-header-block border border-black mb-3 text-[11px] print:text-[10px] bg-white">
        <div className="grid grid-cols-12 divide-x divide-black">
          {/* Kolom Kiri: Logo KAI & Badge TERBATAS */}
          <div className="col-span-2 flex flex-col items-center justify-between p-2 divide-y divide-black">
            <div className="h-14 flex items-center justify-center w-full pb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/kai-logo.png"
                alt="Logo KAI"
                className="h-9 w-auto object-contain max-w-full"
                onError={(e) => {
                  // Fallback jika file gambar tidak ditemukan
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.parentElement?.querySelector(".logo-fallback");
                  if (fallback) (fallback as HTMLElement).style.display = "block";
                }}
              />
              <div className="logo-fallback hidden text-center">
                <span className="font-black text-blue-900 text-sm tracking-wider block">KAI</span>
                <span className="text-[6px] font-bold text-orange-600 tracking-wide block uppercase">
                  Kereta Api Indonesia
                </span>
              </div>
            </div>
            <div className="w-full pt-2 flex items-center justify-center">
              <div className="border border-yellow-500 px-2 py-0.5 text-center w-full bg-yellow-50/50">
                <span className="text-yellow-600 font-extrabold text-[10px] tracking-widest block uppercase">
                  TERBATAS
                </span>
              </div>
            </div>
          </div>

          {/* Kolom Tengah: Judul Resmi Dokumen */}
          <div className="col-span-7 flex flex-col justify-between text-center divide-y divide-black">
            <div className="py-2 px-3">
              <h1 className="text-xs sm:text-sm font-black tracking-wide text-black uppercase">
                PT KERETA API INDONESIA (PERSERO)
              </h1>
              <h2 className="text-[11px] font-bold tracking-wider text-black uppercase mt-0.5">
                SISTEM INFORMASI
              </h2>
            </div>
            <div className="py-2.5 px-3 flex-1 flex items-center justify-center">
              <h3 className="text-xs sm:text-sm font-black tracking-wide text-black uppercase">
                DOKUMENTASI PENGELOLAAN DAN PENANGANAN KELUHAN PELANGGAN
              </h3>
            </div>
          </div>

          {/* Kolom Kanan: Kotak Metadata Dokumen */}
          <div className="col-span-3 text-[10px] divide-y divide-black">
            <div className="grid grid-cols-12 divide-x divide-black py-1">
              <span className="col-span-5 px-2 font-medium">No. Dokumen</span>
              <span className="col-span-7 px-2 font-mono font-bold break-all text-[9px]">: {documentNumber}</span>
            </div>
            <div className="grid grid-cols-12 divide-x divide-black py-1">
              <span className="col-span-5 px-2 font-medium">Tanggal</span>
              <span className="col-span-7 px-2 font-medium truncate">: {documentDate}</span>
            </div>
            <div className="grid grid-cols-12 divide-x divide-black py-1">
              <span className="col-span-5 px-2 font-medium">Versi</span>
              <span className="col-span-7 px-2 font-mono font-bold truncate">: {version}</span>
            </div>
            <div className="grid grid-cols-12 divide-x divide-black py-1">
              <span className="col-span-5 px-2 font-medium">Halaman</span>
              <span className="col-span-7 px-2 font-medium">: {pageInfo}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TABEL REKAPITULASI DENGAN PROPORSI PERSIS KAI */}
      <table className="kai-doc-table kai-document-table w-full table-fixed text-left text-[10px] print:text-[9px] border-collapse border border-black mb-4">
        <thead>
          {/* Header Baris 1 */}
          <tr className="bg-white text-black font-bold text-center border-b border-black">
            <th
              rowSpan={2}
              style={{ width: "3%" }}
              className="border border-black px-1.5 py-1.5 text-center align-middle"
            >
              No
            </th>
            <th
              rowSpan={2}
              style={{ width: "7.5%" }}
              className="border border-black px-1.5 py-1.5 text-center align-middle"
            >
              Tanggal
            </th>
            <th
              rowSpan={2}
              style={{ width: "11.5%" }}
              className="border border-black px-2 py-1.5 text-center align-middle"
            >
              Pelanggan
            </th>
            <th
              rowSpan={2}
              style={{ width: "7.5%" }}
              className="border border-black px-1.5 py-1.5 text-center align-middle"
            >
              Sumber
            </th>
            <th
              rowSpan={2}
              style={{ width: "19%" }}
              className="border border-black px-2 py-1.5 text-center align-middle"
            >
              Deskripsi Keluhan
            </th>
            <th
              rowSpan={2}
              style={{ width: "18.5%" }}
              className="border border-black px-2 py-1.5 text-center align-middle"
            >
              Tindakan perbaikan dan pencegahan yang diambil
            </th>
            <th
              colSpan={3}
              style={{ width: "24.5%" }}
              className="border border-black px-1 py-1 text-center align-middle"
            >
              Verification
            </th>
            <th
              rowSpan={2}
              style={{ width: "8.5%" }}
              className="border border-black px-1.5 py-1.5 text-center align-middle"
            >
              Keterangan
            </th>
          </tr>

          {/* Header Baris 2 (Sub-kolom Verification) */}
          <tr className="bg-white text-black font-bold text-center border-b border-black">
            <th
              style={{ width: "5.5%" }}
              className="border border-black px-1 py-1 text-center align-middle"
            >
              Tgl
            </th>
            <th
              style={{ width: "6.5%" }}
              className="border border-black px-1 py-1 text-center align-middle"
            >
              PIC
            </th>
            <th
              style={{ width: "12.5%" }}
              className="border border-black px-1 py-1 text-center align-middle"
            >
              Hasil
            </th>
          </tr>
        </thead>

        {/* Data Rows */}
        <tbody className="divide-y divide-black text-black">
          {complaints.map((item, idx) => {
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
                ? item.verifications &&
                  item.verifications.length > 0 &&
                  item.verifications[0].feedback
                  ? item.verifications[0].feedback
                  : "Disetujui"
                : item.status;

            return (
              <tr key={item.id} className="align-top hover:bg-slate-50 break-inside-avoid">
                <td className="border border-black p-1.5 text-center font-medium">
                  {idx + 1}
                </td>
                <td className="border border-black p-1.5 text-center whitespace-nowrap">
                  {formattedDate}
                </td>
                <td className="border border-black p-1.5 break-words">
                  <span className="font-bold block break-words">{item.customerName}</span>
                  {item.daopOrStation && (
                    <span className="text-[9px] print:text-[8px] text-slate-600 block break-words">
                      {item.daopOrStation}
                    </span>
                  )}
                  {item.customerContact && (
                    <span className="text-[9px] print:text-[8px] text-slate-600 block break-words">
                      {item.customerContact}
                    </span>
                  )}
                </td>
                <td className="border border-black p-1.5 break-words">{item.source}</td>
                <td className="border border-black p-1.5 leading-snug break-words">
                  {item.description}
                </td>
                <td className="border border-black p-1.5 space-y-1 break-words">
                  {item.correctiveAction ? (
                    <div>
                      <span className="font-bold text-[9px] uppercase block text-slate-800">
                        Perbaikan:
                      </span>
                      <span className="break-words">{item.correctiveAction}</span>
                    </div>
                  ) : null}
                  {item.preventiveAction ? (
                    <div
                      className={
                        item.correctiveAction ? "pt-1 border-t border-slate-200" : ""
                      }
                    >
                      <span className="font-bold text-[9px] uppercase block text-slate-800">
                        Pencegahan:
                      </span>
                      <span className="break-words">{item.preventiveAction}</span>
                    </div>
                  ) : null}
                  {!item.correctiveAction && !item.preventiveAction && (
                    <span className="text-slate-400 italic">Belum ada tindakan</span>
                  )}
                </td>
                <td className="border border-black p-1.5 text-center whitespace-nowrap">
                  {verificationDate}
                </td>
                <td className="border border-black p-1.5 text-center font-medium break-words">
                  {picName}
                </td>
                <td className="border border-black p-1.5 text-center break-words">
                  <span
                    className={`px-1 py-0.5 rounded text-[8.5px] print:text-[8px] font-bold uppercase inline-block border ${
                      item.status === "TERVERIFIKASI"
                        ? "bg-emerald-100 text-emerald-900 border-emerald-400"
                        : "bg-slate-100 text-slate-800 border-slate-300"
                    }`}
                  >
                    {verificationResult}
                  </span>
                </td>
                <td className="border border-black p-1.5 font-mono text-[9px] break-words">
                  <div className="font-bold text-slate-900 break-words">{item.complaintNumber}</div>
                  {item.notes && <div className="text-slate-600 mt-0.5 break-words">{item.notes}</div>}
                </td>
              </tr>
            );
          })}

          {/* Baris kosong penyeimbang jika data keluhan kurang dari 4 */}
          {complaints.length < 4 &&
            Array.from({ length: 4 - complaints.length }).map((_, i) => (
              <tr key={`empty-${i}`} className="h-8 break-inside-avoid">
                <td className="border border-black p-1.5 text-center text-slate-300">
                  {complaints.length + i + 1}
                </td>
                <td className="border border-black p-1.5"></td>
                <td className="border border-black p-1.5"></td>
                <td className="border border-black p-1.5"></td>
                <td className="border border-black p-1.5"></td>
                <td className="border border-black p-1.5"></td>
                <td className="border border-black p-1.5"></td>
                <td className="border border-black p-1.5"></td>
                <td className="border border-black p-1.5"></td>
                <td className="border border-black p-1.5"></td>
              </tr>
            ))}
        </tbody>
      </table>

      {/* 3. TANDA TANGAN RESMI KAI */}
      <div className="kai-signature-block kai-keep-together mt-6 pt-2 grid grid-cols-2 gap-8 text-center text-xs print:text-[10px] break-inside-avoid">
        <div>
          <p className="text-slate-700 mb-1">Dibuat Oleh (Pelaksana SPKP):</p>
          <p className="font-bold text-black">Petugas Pengelola SPKP</p>
          <div className="h-14 flex items-end justify-center">
            <p className="font-bold text-black underline underline-offset-4">
              {creatorName}
            </p>
          </div>
          <p className="text-[10px] print:text-[8px] text-slate-600 mt-1">
            Tanggal: {documentDate}
          </p>
        </div>

        <div>
          <p className="text-slate-700 mb-1">Mengetahui:</p>
          <p className="font-bold text-black">Management Representative (MR)</p>
          <div className="h-14 flex items-end justify-center">
            <p className="font-bold text-black underline underline-offset-4">
              {managementRep}
            </p>
          </div>
          <p className="text-[10px] print:text-[8px] text-slate-600 mt-1">
            Tanggal: {documentDate}
          </p>
        </div>
      </div>

      {/* Footer dihapus sesuai permintaan */}
    </div>
  );
}
