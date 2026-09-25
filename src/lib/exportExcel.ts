import * as XLSX from "xlsx";
import { ComplaintData } from "@/components/DashboardClient";
import { calculateSla } from "@/lib/sla";

export function exportComplaintsToExcel(complaints: ComplaintData[], filenamePrefix = "Rekapitulasi_Keluhan_SPKP_KAI") {
  const rows = complaints.map((item, index) => {
    const formattedDate = new Date(item.date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const formattedSubmittedAt = item.submittedAt
      ? new Date(item.submittedAt).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

    const slaResult = calculateSla({
      date: item.date,
      status: item.status,
      submittedAt: item.submittedAt,
      createdAt: item.createdAt,
    });

    return {
      No: index + 1,
      "No. Keluhan": item.complaintNumber,
      Tanggal: formattedDate,
      "Nama Pelapor": item.customerName,
      "Kontak Pelapor": item.customerContact || "-",
      "Wilayah / Daop": item.daopOrStation || "-",
      "Sumber Laporan": item.source,
      "Uraian Keluhan": item.description,
      "Petugas PIC": item.pic ? `${item.pic.name} (${item.pic.email})` : "Belum Ditugaskan",
      "Tindakan Perbaikan": item.correctiveAction || "-",
      "Tindakan Pencegahan": item.preventiveAction || "-",
      "URL Bukti Foto (Supabase)": item.proofImageUrl || "-",
      "Status Penanganan": item.status,
      "Waktu Submit Verifikasi": formattedSubmittedAt,
      "Audit SLA (Target 24 Jam)": slaResult.statusText,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set explicit column widths for readability in Excel
  worksheet["!cols"] = [
    { wch: 5 },  // No
    { wch: 16 }, // No. Keluhan
    { wch: 14 }, // Tanggal
    { wch: 22 }, // Nama Pelapor
    { wch: 18 }, // Kontak Pelapor
    { wch: 25 }, // Wilayah / Daop
    { wch: 18 }, // Sumber Laporan
    { wch: 40 }, // Uraian Keluhan
    { wch: 24 }, // Petugas PIC
    { wch: 35 }, // Tindakan Perbaikan
    { wch: 35 }, // Tindakan Pencegahan
    { wch: 30 }, // Bukti Foto
    { wch: 20 }, // Status Penanganan
    { wch: 22 }, // Waktu Submit Verifikasi
    { wch: 25 }, // Audit SLA
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rekapitulasi SPKP");

  const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
  XLSX.writeFile(workbook, `${filenamePrefix}_${todayStr}.xlsx`);
}
