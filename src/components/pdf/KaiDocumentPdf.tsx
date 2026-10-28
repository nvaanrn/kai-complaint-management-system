import React from "react";
import { Document, Page, Text, View, StyleSheet, Image as PdfImage } from "@react-pdf/renderer";
import { ComplaintData } from "@/components/DashboardClient";

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 28,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#000000",
  },
  // KOP / Header Box 3 Bagian
  headerBox: {
    borderWidth: 1,
    borderColor: "#000000",
    flexDirection: "row",
    marginBottom: 8,
  },
  headerLeft: {
    width: "16%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    flexDirection: "column",
  },
  logoContainer: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  logoImage: {
    width: 75,
    height: 25,
  },
  terbatasContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  logoPlaceholder: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a8a",
    letterSpacing: 1,
    paddingTop: 2,
  },
  logoSub: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: "#f97316",
    marginTop: -2,
    letterSpacing: 0.5,
  },
  terbatasBox: {
    borderWidth: 1.5,
    borderColor: "#eab308",
    paddingVertical: 2,
    paddingHorizontal: 6,
    width: "90%",
    alignItems: "center",
    marginBottom: 2,
  },
  terbatasText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#ca8a04",
    letterSpacing: 1,
  },
  headerCenter: {
    width: "56%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    flexDirection: "column",
  },
  headerCenterTop: {
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingVertical: 4,
    alignItems: "center",
  },
  companyName: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  companyDivision: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginTop: 1,
  },
  headerCenterBottom: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  documentTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  headerRight: {
    width: "28%",
    flexDirection: "column",
  },
  metaRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  metaRowLast: {
    flexDirection: "row",
  },
  metaLabel: {
    width: "42%",
    fontSize: 7,
    fontFamily: "Helvetica",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    paddingVertical: 3,
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  metaValue: {
    width: "58%",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 3,
    paddingHorizontal: 4,
    justifyContent: "center",
  },

  // Tabel Rekapitulasi
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000000",
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
    minHeight: 24,
  },
  tableHeaderGroup: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    textAlign: "center",
  },

  th: {
    padding: 2.5,
    borderRightWidth: 0.5,
    borderRightColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    flexGrow: 0,
  },
  td: {
    padding: 3,
    fontSize: 6.5,
    borderRightWidth: 0.5,
    borderRightColor: "#000000",
    flexShrink: 0,
    flexGrow: 0,
  },
  lastCol: {
    borderRightWidth: 0,
  },

  // Signature Block
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 4,
  },
  signatureBox: {
    width: "40%",
    textAlign: "center",
  },
  signatureRole: {
    fontSize: 7.5,
    color: "#334155",
    marginBottom: 4,
  },
  signatureSubRole: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 35,
  },
  signatureName: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textDecoration: "underline",
    color: "#000000",
  },
  signatureDate: {
    fontSize: 6.5,
    color: "#64748b",
    marginTop: 2,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 12,
    left: 28,
    right: 28,
    borderTopWidth: 0.5,
    borderTopColor: "#94a3b8",
    paddingTop: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: "#64748b",
  },
});

interface KaiDocumentPdfProps {
  complaints: ComplaintData[];
  documentNumber?: string;
  documentDate?: string;
  version?: string;
  managementRep?: string;
  creatorName?: string;
  logoUrl?: string;
}

export function KaiDocumentPdf({
  complaints,
  documentNumber = "FR.SM/TI/033.001/10-2020",
  documentDate = "12 Oktober 2020",
  version = "002-2020",
  managementRep = "Ir. Bambang Triyono (MR)",
  creatorName = "Petugas SPKP KAI",
  logoUrl,
}: KaiDocumentPdfProps) {
  // Lebar kolom persis proporsional standar KAI
  const colWidths = {
    no: "3.5%",
    tanggal: "8.5%",
    pelanggan: "12%",
    sumber: "9%",
    deskripsi: "20.5%",
    tindakan: "19.5%",
    verifGroup: "17.5%",
    verifTgl: "6%",
    verifPic: "6%",
    verifHasil: "5.5%",
    keterangan: "9.5%",
  };

  return (
    <Document title={`Dokumen-KAI-${documentNumber.replace(/[\/\\:]/g, "-")}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* 1. KOP / HEADER BAKU KAI 3-BAGIAN */}
        <View style={styles.headerBox}>
          {/* Kolom Kiri: Logo KAI & Badge TERBATAS */}
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              {logoUrl ? (
                <PdfImage src={logoUrl} style={styles.logoImage} />
              ) : (
                <>
                  <Text style={styles.logoPlaceholder}>KAI</Text>
                  <Text style={styles.logoSub}>Kereta Api Indonesia</Text>
                </>
              )}
            </View>
            <View style={styles.terbatasContainer}>
              <View style={styles.terbatasBox}>
                <Text style={styles.terbatasText}>TERBATAS</Text>
              </View>
            </View>
          </View>

          {/* Kolom Tengah: Judul Resmi */}
          <View style={styles.headerCenter}>
            <View style={styles.headerCenterTop}>
              <Text style={styles.companyName}>PT KERETA API INDONESIA(PERSERO)</Text>
              <Text style={styles.companyDivision}>SISTEM INFORMASI</Text>
            </View>
            <View style={styles.headerCenterBottom}>
              <Text style={styles.documentTitle}>
                DOKUMENTASI PENGELOLAAN DAN PENANGANAN KELUHAN PELANGGAN
              </Text>
            </View>
          </View>

          {/* Kolom Kanan: Kotak Metadata Dokumen */}
          <View style={styles.headerRight}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>No. Dokumen</Text>
              <Text style={styles.metaValue}>: {documentNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Tanggal</Text>
              <Text style={styles.metaValue}>: {documentDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Versi</Text>
              <Text style={styles.metaValue}>: {version}</Text>
            </View>
            <View style={styles.metaRowLast}>
              <Text style={styles.metaLabel}>Halaman</Text>
              <Text
                style={styles.metaValue}
                render={({ pageNumber, totalPages }) => `: ${pageNumber} dari ${totalPages}`}
              />
            </View>
          </View>
        </View>

        {/* 2. TABEL REKAPITULASI RESMI */}
        <View style={styles.table}>
          {/* Header Baris 1 & 2 (Merged) - fixed agar berulang di setiap halaman */}
          <View style={styles.tableHeaderGroup} fixed>
            <View style={[styles.th, { width: colWidths.no }]}><Text>No</Text></View>
            <View style={[styles.th, { width: colWidths.tanggal }]}><Text>Tanggal</Text></View>
            <View style={[styles.th, { width: colWidths.pelanggan }]}><Text>Pelanggan</Text></View>
            <View style={[styles.th, { width: colWidths.sumber }]}><Text>Sumber</Text></View>
            <View style={[styles.th, { width: colWidths.deskripsi }]}><Text>Deskripsi Keluhan</Text></View>
            <View style={[styles.th, { width: colWidths.tindakan }]}><Text>Tindakan perbaikan dan pencegahan yang diambil</Text></View>
            
            <View style={{ width: colWidths.verifGroup, borderRightWidth: 0.5, borderRightColor: "#000000", flexDirection: "column", flexShrink: 0, flexGrow: 0 }}>
              <View style={{ flex: 1, borderBottomWidth: 0.5, borderBottomColor: "#000000", padding: 2.5, alignItems: "center", justifyContent: "center" }}>
                <Text>Verification</Text>
              </View>
              <View style={{ flexDirection: "row", flex: 1 }}>
                <View style={{ width: "34.285%", borderRightWidth: 0.5, borderRightColor: "#000000", padding: 2.5, alignItems: "center", justifyContent: "center", flexShrink: 0, flexGrow: 0 }}>
                  <Text>Tgl</Text>
                </View>
                <View style={{ width: "34.285%", borderRightWidth: 0.5, borderRightColor: "#000000", padding: 2.5, alignItems: "center", justifyContent: "center", flexShrink: 0, flexGrow: 0 }}>
                  <Text>PIC</Text>
                </View>
                <View style={{ width: "31.43%", padding: 2.5, alignItems: "center", justifyContent: "center", flexShrink: 0, flexGrow: 0 }}>
                  <Text>Hasil</Text>
                </View>
              </View>
            </View>

            <View style={[styles.th, { width: colWidths.keterangan, borderRightWidth: 0 }]}><Text>Keterangan</Text></View>
          </View>



          {/* Data Rows */}
          {complaints.map((item, idx) => {
            const formattedDate = new Date(item.date).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });

            const verificationDate =
              item.verifications && item.verifications.length > 0
                ? new Date(item.verifications[0].verifiedAt).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : item.submittedAt
                ? new Date(item.submittedAt).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "-";

            const picName = item.pic?.name || (item.picId ? "PIC Ditugaskan" : "-");
            const verificationResult =
              item.status === "TERVERIFIKASI"
                ? (item.verifications && item.verifications.length > 0 && item.verifications[0].feedback ? item.verifications[0].feedback : "Disetujui")
                : item.status;

            const actions =
              (item.correctiveAction ? `Perbaikan: ${item.correctiveAction}\n` : "") +
              (item.preventiveAction ? `Pencegahan: ${item.preventiveAction}` : "") ||
              "Belum ada tindakan";

            return (
              <View key={item.id} style={styles.tableRow} wrap={false}>
                <View style={[styles.td, { width: colWidths.no, alignItems: "center" }]}>
                  <Text>{idx + 1}</Text>
                </View>
                <View style={[styles.td, { width: colWidths.tanggal, alignItems: "center" }]}>
                  <Text>{formattedDate}</Text>
                </View>
                <View style={[styles.td, { width: colWidths.pelanggan }]}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>{item.customerName}</Text>
                  {item.daopOrStation ? <Text style={{ fontSize: 5.5, marginTop: 1, color: "#64748b" }}>{item.daopOrStation.replace(/\n/g, " ")}</Text> : null}
                  {item.customerContact ? <Text style={{ fontSize: 5.5, marginTop: 1, color: "#64748b" }}>{item.customerContact.replace(/\n/g, " ")}</Text> : null}
                </View>
                <View style={[styles.td, { width: colWidths.sumber }]}>
                  <Text>{item.source}</Text>
                </View>
                <View style={[styles.td, { width: colWidths.deskripsi }]}>
                  <Text style={{ lineHeight: 1.3 }}>{item.description ? item.description.replace(/\n/g, " ") : ""}</Text>
                </View>
                <View style={[styles.td, { width: colWidths.tindakan }]}>
                  {item.correctiveAction ? (
                    <View style={{ marginBottom: 3 }}>
                      <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 5.5, color: "#334155", textTransform: "uppercase" }}>Perbaikan:</Text>
                      <Text style={{ lineHeight: 1.3 }}>{item.correctiveAction.replace(/\n/g, " ")}</Text>
                    </View>
                  ) : null}
                  {item.preventiveAction ? (
                    <View style={item.correctiveAction ? { paddingTop: 2, borderTopWidth: 0.5, borderTopColor: "#cbd5e1" } : {}}>
                      <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 5.5, color: "#334155", textTransform: "uppercase" }}>Pencegahan:</Text>
                      <Text style={{ lineHeight: 1.3 }}>{item.preventiveAction.replace(/\n/g, " ")}</Text>
                    </View>
                  ) : null}
                  {!item.correctiveAction && !item.preventiveAction && (
                    <Text style={{ color: "#94a3b8", fontStyle: "italic" }}>Belum ada tindakan</Text>
                  )}
                </View>
                <View style={[styles.td, { width: colWidths.verifTgl, alignItems: "center" }]}>
                  <Text>{verificationDate}</Text>
                </View>
                <View style={[styles.td, { width: colWidths.verifPic, alignItems: "center" }]}>
                  <Text>{picName}</Text>
                </View>
                <View style={[styles.td, { width: colWidths.verifHasil, alignItems: "center", justifyContent: "center" }]}>
                  <View style={{
                    backgroundColor: item.status === "TERVERIFIKASI" ? "#d1fae5" : "#f1f5f9",
                    borderWidth: item.status === "TERVERIFIKASI" ? 0.5 : 0,
                    borderColor: "#6ee7b7",
                    paddingVertical: 2,
                    paddingHorizontal: 3,
                    borderRadius: 2
                  }}>
                    <Text style={{
                      fontSize: 5,
                      fontFamily: "Helvetica-Bold",
                      color: item.status === "TERVERIFIKASI" ? "#064e3b" : "#1e293b",
                      textTransform: "uppercase"
                    }}>
                      {verificationResult}
                    </Text>
                  </View>
                </View>
                <View style={[styles.td, { width: colWidths.keterangan, borderRightWidth: 0 }]}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>{item.complaintNumber}</Text>
                  {item.notes ? <Text style={{ fontSize: 5.5, color: "#475569", marginTop: 2 }}>{item.notes.replace(/\n/g, " ")}</Text> : null}
                </View>
              </View>
            );
          })}

          {/* Baris kosong jika data sedikit */}
          {complaints.length < 4 &&
            Array.from({ length: 4 - complaints.length }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.tableRow} wrap={false}>
                <View style={[styles.td, { width: colWidths.no, alignItems: "center" }]}>
                  <Text style={{ color: "#cbd5e1" }}>{complaints.length + i + 1}</Text>
                </View>
                <View style={[styles.td, { width: colWidths.tanggal }]}></View>
                <View style={[styles.td, { width: colWidths.pelanggan }]}></View>
                <View style={[styles.td, { width: colWidths.sumber }]}></View>
                <View style={[styles.td, { width: colWidths.deskripsi }]}></View>
                <View style={[styles.td, { width: colWidths.tindakan }]}></View>
                <View style={[styles.td, { width: colWidths.verifTgl }]}></View>
                <View style={[styles.td, { width: colWidths.verifPic }]}></View>
                <View style={[styles.td, { width: colWidths.verifHasil }]}></View>
                <View style={[styles.td, { width: colWidths.keterangan, borderRightWidth: 0 }]}></View>
              </View>
            ))}
        </View>

        {/* 3. TANDA TANGAN RESMI KAI */}
        <View style={styles.signatureSection} wrap={false}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureRole}>Dibuat Oleh (Pelaksana SPKP):</Text>
            <Text style={styles.signatureSubRole}>Petugas Pengelola SPKP</Text>
            <Text style={styles.signatureName}>{creatorName || "Petugas SPKP KAI"}</Text>
            <Text style={styles.signatureDate}>Tanggal: {documentDate}</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.signatureRole}>Mengetahui:</Text>
            <Text style={styles.signatureSubRole}>Management Representative (MR)</Text>
            <Text style={styles.signatureName}>{managementRep}</Text>
            <Text style={styles.signatureDate}>Tanggal: {documentDate}</Text>
          </View>
        </View>

        {/* 4. FOOTER */}
        <View style={styles.footer} fixed>
          <Text>PT Kereta Api Indonesia (Persero)</Text>
          <Text>Edisi: {version}</Text>
        </View>
      </Page>
    </Document>
  );
}
