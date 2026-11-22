/**
 * Aturan murni (tanpa database) untuk pengelolaan data master SPKP:
 * wilayah operasional, kategori keluhan, dan sumber keluhan.
 */

export type MasterKind = "area" | "source" | "category";

export const MASTER_KINDS: readonly MasterKind[] = ["area", "source", "category"];

export const MASTER_LABELS: Record<MasterKind, string> = {
  area: "Wilayah Operasional",
  category: "Kategori Keluhan",
  source: "Sumber Keluhan",
};

export interface MasterItem {
  id: string;
  name: string;
  isActive: boolean;
  usageCount: number;
  slaHours?: number;
  description?: string | null;
}

export interface MasterDataLists {
  areas: MasterItem[];
  sources: MasterItem[];
  categories: MasterItem[];
}

export const EMPTY_MASTER_DATA: MasterDataLists = { areas: [], sources: [], categories: [] };

export interface MasterItemInput {
  name?: string;
  slaHours?: number;
  description?: string | null;
  isActive?: boolean;
}

export interface MasterActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

// Kategori bawaan dipakai sistem (keluhan baru tanpa pilihan kategori), jadi tidak boleh diubah namanya,
// dinonaktifkan, atau dihapus. Target SLA dan deskripsinya tetap boleh diubah.
export const DEFAULT_CATEGORY_NAME = "Umum / Belum Dikategorikan";

export const MASTER_NAME_MAX_LENGTH = 100;
export const SLA_HOURS_MIN = 1;
export const SLA_HOURS_MAX = 720;
export const DESCRIPTION_MAX_LENGTH = 500;

export function isMasterKind(value: unknown): value is MasterKind {
  return typeof value === "string" && (MASTER_KINDS as readonly string[]).includes(value);
}

export function normalizeMasterName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function validateMasterName(raw: unknown): { valid: boolean; value: string; error?: string } {
  if (typeof raw !== "string") {
    return { valid: false, value: "", error: "Nama wajib diisi." };
  }
  const value = normalizeMasterName(raw);
  if (!value) {
    return { valid: false, value, error: "Nama wajib diisi." };
  }
  if (value.length > MASTER_NAME_MAX_LENGTH) {
    return { valid: false, value, error: `Nama maksimal ${MASTER_NAME_MAX_LENGTH} karakter.` };
  }
  return { valid: true, value };
}

export function validateSlaHours(raw: unknown): { valid: boolean; value: number; error?: string } {
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    return { valid: false, value: 0, error: "Target SLA harus berupa bilangan bulat (jam kerja)." };
  }
  if (raw < SLA_HOURS_MIN || raw > SLA_HOURS_MAX) {
    return {
      valid: false,
      value: raw,
      error: `Target SLA harus antara ${SLA_HOURS_MIN} dan ${SLA_HOURS_MAX} jam kerja.`,
    };
  }
  return { valid: true, value: raw };
}

export function normalizeDescription(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().slice(0, DESCRIPTION_MAX_LENGTH);
  return value ? value : null;
}

export function isProtectedMasterItem(kind: MasterKind, name: string): boolean {
  return kind === "category" && normalizeMasterName(name).toLowerCase() === DEFAULT_CATEGORY_NAME.toLowerCase();
}

// Data yang sudah dipakai keluhan tidak boleh dihapus permanen (riwayat dan laporan harus utuh).
export function decideDeleteAction(usageCount: number): "DELETE" | "DEACTIVATE" {
  return usageCount > 0 ? "DEACTIVATE" : "DELETE";
}

export function toMasterItem(row: {
  id: string;
  name: string;
  isActive: boolean;
  slaHours?: number;
  description?: string | null;
  _count: { complaints: number };
}): MasterItem {
  const item: MasterItem = {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    usageCount: row._count.complaints,
  };
  if (row.slaHours !== undefined) item.slaHours = row.slaHours;
  if (row.description !== undefined) item.description = row.description;
  return item;
}
