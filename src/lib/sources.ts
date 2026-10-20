/**
 * Sumber Kebenaran Tunggal (Single Source of Truth) untuk Saluran Pelaporan Keluhan KAI
 * Sistem Penanganan Keluhan Pelanggan (SPKP) PT Kereta Api Indonesia (Persero)
 */

export const VALID_SOURCES = [
  "Aplikasi Access by KAI",
  "Contact Center 121",
  "Media Sosial (Twitter/X, IG)",
  "Petugas Stasiun / Loket",
  "Email Resmi KAI",
  "Lainnya",
] as const;

export type ComplaintSource = (typeof VALID_SOURCES)[number];

export interface SourceMeta {
  source: ComplaintSource;
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
}

export const SOURCE_METADATA: Record<ComplaintSource, Omit<SourceMeta, "source">> = {
  "Aplikasi Access by KAI": {
    icon: "📱",
    color: "bg-blue-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    description: "Kanal digital mobile resmi Access by KAI",
  },
  "Contact Center 121": {
    icon: "📞",
    color: "bg-amber-600",
    bgColor: "bg-amber-50",
    textColor: "text-amber-800",
    description: "Layanan telepon pelanggan resmi Contact Center 121",
  },
  "Media Sosial (Twitter/X, IG)": {
    icon: "💬",
    color: "bg-sky-600",
    bgColor: "bg-sky-50",
    textColor: "text-sky-700",
    description: "Kanal resmi media sosial Twitter/X & Instagram KAI121",
  },
  "Petugas Stasiun / Loket": {
    icon: "🏢",
    color: "bg-emerald-600",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    description: "Laporan tatap muka langsung di stasiun operasional & loket KAI",
  },
  "Email Resmi KAI": {
    icon: "✉️",
    color: "bg-indigo-600",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-700",
    description: "Korenspondensi surat elektronik resmi cs@kai.id",
  },
  "Lainnya": {
    icon: "📋",
    color: "bg-slate-600",
    bgColor: "bg-slate-50",
    textColor: "text-slate-700",
    description: "Saluran pelaporan umum dan internal lainnya",
  },
};

/**
 * Pemetaan kompatibilitas data historis (Legacy Source Mapping)
 * Memastikan data lama atau variasi input tetap teragregasi secara akurat
 */
export const LEGACY_SOURCE_MAPPING: Record<string, ComplaintSource> = {
  "telepon": "Contact Center 121",
  "email": "Email Resmi KAI",
  "laporan langsung": "Petugas Stasiun / Loket",
  "nota dinas": "Lainnya",
  "helpdesk internal": "Lainnya",
  "survey pelanggan": "Lainnya",
  "access by kai": "Aplikasi Access by KAI",
  "contact center 121": "Contact Center 121",
  "media sosial": "Media Sosial (Twitter/X, IG)",
  "petugas stasiun / loket": "Petugas Stasiun / Loket",
  "email resmi kai": "Email Resmi KAI",
  "lainnya": "Lainnya",
};

/**
 * Fungsi normalisasi nama saluran keluhan
 */
export function normalizeComplaintSource(source: string | null | undefined): ComplaintSource {
  if (!source) return "Lainnya";
  const trimmed = source.trim();

  // 1. Cek kecocokan persis dengan salah satu VALID_SOURCES
  const exact = VALID_SOURCES.find((s) => s.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;

  // 2. Cek pemetaan saluran warisan (legacy)
  const mapped = LEGACY_SOURCE_MAPPING[trimmed.toLowerCase()];
  if (mapped) return mapped;

  // 3. Fallback aman
  return "Lainnya";
}
