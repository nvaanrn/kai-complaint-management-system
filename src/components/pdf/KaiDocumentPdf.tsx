import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { ComplaintData } from "@/components/DashboardClient";

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 35,
    paddingHorizontal: 35,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  headerContainer: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#1e3a8a",
    paddingBottom: 10,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e3a8a",
  },
  brandSubtitle: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
  },
  docCodeBadge: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 9,
    fontWeight: "bold",
    color: "#1e3a8a",
    textAlign: "right",
  },
  docVersionText: {
    fontSize: 7,
    color: "#64748b",
    marginTop: 2,
    textAlign: "right",
  },
  titleBlock: {
    textAlign: "center",
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#0f172a",
  },
  subTitle: {
    fontSize: 8,
    color: "#475569",
    marginTop: 2,
  },
  metaTable: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    backgroundColor: "#f8fafc",
    padding: 6,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
  },
  metaItem: {
    fontSize: 8,
  },
  metaLabel: {
    color: "#64748b",
    fontWeight: "normal",
  },
  metaValue: {
    fontWeight: "bold",
    color: "#0f172a",
  },
  table: {
    width: "100%",
    borderWidth: 0.5,
    borderColor: "#94a3b8",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#94a3b8",
    fontWeight: "bold",
    fontSize: 7.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
    minHeight: 24,
  },
  th: {
    padding: 4,
    fontWeight: "bold",
    color: "#1e293b",
    borderRightWidth: 0.5,
    borderRightColor: "#cbd5e1",
    textAlign: "center",
  },
  td: {
    padding: 4,
    fontSize: 7.5,
    borderRightWidth: 0.5,
    borderRightColor: "#cbd5e1",
  },
  lastCol: {
    borderRightWidth: 0,
  },
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingTop: 10,
  },
  signatureBox: {
    width: "40%",
    textAlign: "center",
  },
  signatureRole: {
    fontSize: 8,
    color: "#475569",
    marginBottom: 40,
  },
  signatureName: {
    fontSize: 9,
    fontWeight: "bold",
    textDecoration: "underline",
    color: "#0f172a",
  },
  signatureDate: {
    fontSize: 7,
    color: "#64748b",
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 15,
    left: 35,
    right: 35,
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    paddingTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#94a3b8",
  },
});

interface KaiDocumentPdfProps {
  complaints: ComplaintData[];
  documentNumber: string;
  managementRep: string;
  creatorName: string;
}

export function KaiDocumentPdf({
  complaints,
  documentNumber,
  managementRep,
  creatorName,
}: KaiDocumentPdfProps) {
  const currentDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document title={`Laporan-SPKP-${documentNumber}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.brandTitle}>PT KERETA API INDONESIA (PERSERO)</Text>
            <Text style={styles.brandSubtitle}>
              Sistem Penanganan Keluhan Pelanggan (SPKP) &bull; Pengendalian Mutu Layanan
            </Text>
          </View>
          <View>
            <Text style={styles.docCodeBadge}>FR.SM/TI/033.001</Text>
            <Text style={styles.docVersionText}>Edisi: 002-2020</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.mainTitle}>
            Daftar Rekapitulasi Tindak Lanjut Keluhan Pelanggan
          </Text>
          <Text style={styles.subTitle}>
            Dokumen resmi penanganan dan verifikasi mutu keluhan pelanggan kereta api
          </Text>
        </View>

        {/* Metadata */}
        <View style={styles.metaTable}>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Nomor Dokumen: </Text>
            <Text style={styles.metaValue}>{documentNumber}</Text>
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Tanggal Cetak: </Text>
            <Text style={styles.metaValue}>{currentDate}</Text>
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Management Representative: </Text>
            <Text style={styles.metaValue}>{managementRep}</Text>
          </Text>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: "4%" }]}>No</Text>
            <Text style={[styles.th, { width: "12%" }]}>No. Keluhan</Text>
            <Text style={[styles.th, { width: "10%" }]}>Tanggal</Text>
            <Text style={[styles.th, { width: "15%" }]}>Nama Pelapor</Text>
            <Text style={[styles.th, { width: "10%" }]}>Sumber</Text>
            <Text style={[styles.th, { width: "19%" }]}>Uraian Keluhan</Text>
            <Text style={[styles.th, { width: "18%" }]}>Tindakan Penanganan</Text>
            <Text style={[styles.th, { width: "12%" }]}>Status Mutu</Text>
          </View>

          {/* Body Rows */}
          {complaints.map((item, idx) => {
            const formattedDate = new Date(item.date).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });

            return (
              <View key={item.id} style={styles.tableRow} wrap={false}>
                <Text style={[styles.td, { width: "4%", textAlign: "center" }]}>
                  {idx + 1}
                </Text>
                <Text style={[styles.td, { width: "12%", fontWeight: "bold" }]}>
                  {item.complaintNumber}
                </Text>
                <Text style={[styles.td, { width: "10%" }]}>{formattedDate}</Text>
                <Text style={[styles.td, { width: "15%" }]}>
                  {item.customerName}
                  {item.daopOrStation ? `\n(${item.daopOrStation})` : ""}
                </Text>
                <Text style={[styles.td, { width: "10%" }]}>{item.source}</Text>
                <Text style={[styles.td, { width: "19%" }]}>{item.description}</Text>
                <Text style={[styles.td, { width: "18%" }]}>
                  {item.correctiveAction
                    ? `Perbaikan: ${item.correctiveAction}\nPencegahan: ${item.preventiveAction || "-"}`
                    : "Belum ada tindakan"}
                </Text>
                <Text style={[styles.td, { width: "12%", textAlign: "center" }]}>
                  {item.status === "TERVERIFIKASI" ? "Terverifikasi" : item.status}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Signature Blocks */}
        <View style={styles.signatureSection} wrap={false}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureRole}>Dibuat Oleh (Pelaksana SPKP):</Text>
            <Text style={styles.signatureName}>{creatorName || "Petugas SPKP KAI"}</Text>
            <Text style={styles.signatureDate}>Tanggal: {currentDate}</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.signatureRole}>Mengetahui (Management Representative):</Text>
            <Text style={styles.signatureName}>{managementRep}</Text>
            <Text style={styles.signatureDate}>Tanggal: {currentDate}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Formulir Pengendalian Mutu FR.SM/TI/033.001 &bull; PT Kereta Api Indonesia (Persero)</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
