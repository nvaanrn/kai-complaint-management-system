import { describe, it, expect } from "vitest";
import {
  DEFAULT_CATEGORY_NAME,
  decideDeleteAction,
  isMasterKind,
  isProtectedMasterItem,
  normalizeMasterName,
  toMasterItem,
  validateMasterName,
  validateSlaHours,
} from "@/lib/masterDataRules";

describe("masterDataRules: nama", () => {
  it("merapikan spasi berlebih", () => {
    expect(normalizeMasterName("  Daop   10   Baru ")).toBe("Daop 10 Baru");
  });

  it("menolak nama kosong atau hanya spasi", () => {
    expect(validateMasterName("").valid).toBe(false);
    expect(validateMasterName("    ").valid).toBe(false);
    expect(validateMasterName(undefined).valid).toBe(false);
  });

  it("menolak nama yang terlalu panjang", () => {
    expect(validateMasterName("a".repeat(101)).valid).toBe(false);
    expect(validateMasterName("a".repeat(100)).valid).toBe(true);
  });

  it("mengembalikan nilai yang sudah dirapikan", () => {
    const res = validateMasterName("  Sumber   Baru ");
    expect(res.valid).toBe(true);
    expect(res.value).toBe("Sumber Baru");
  });
});

describe("masterDataRules: target SLA", () => {
  it("menerima bilangan bulat dalam rentang", () => {
    expect(validateSlaHours(1).valid).toBe(true);
    expect(validateSlaHours(24).valid).toBe(true);
    expect(validateSlaHours(720).valid).toBe(true);
  });

  it("menolak nol, negatif, pecahan, NaN, dan di atas batas", () => {
    expect(validateSlaHours(0).valid).toBe(false);
    expect(validateSlaHours(-5).valid).toBe(false);
    expect(validateSlaHours(1.5).valid).toBe(false);
    expect(validateSlaHours(Number.NaN).valid).toBe(false);
    expect(validateSlaHours(721).valid).toBe(false);
    expect(validateSlaHours("24").valid).toBe(false);
    expect(validateSlaHours(undefined).valid).toBe(false);
  });
});

describe("masterDataRules: hapus vs nonaktifkan", () => {
  it("data yang sudah dipakai hanya dinonaktifkan", () => {
    expect(decideDeleteAction(1)).toBe("DEACTIVATE");
    expect(decideDeleteAction(25)).toBe("DEACTIVATE");
  });

  it("data yang belum dipakai boleh dihapus permanen", () => {
    expect(decideDeleteAction(0)).toBe("DELETE");
  });
});

describe("masterDataRules: kategori bawaan dan jenis master", () => {
  it("kategori bawaan dilindungi, tidak peka huruf besar/kecil dan spasi", () => {
    expect(isProtectedMasterItem("category", DEFAULT_CATEGORY_NAME)).toBe(true);
    expect(isProtectedMasterItem("category", "  umum / belum   dikategorikan ")).toBe(true);
  });

  it("nama yang sama pada jenis lain atau kategori lain tidak dilindungi", () => {
    expect(isProtectedMasterItem("area", DEFAULT_CATEGORY_NAME)).toBe(false);
    expect(isProtectedMasterItem("source", DEFAULT_CATEGORY_NAME)).toBe(false);
    expect(isProtectedMasterItem("category", "Fasilitas Kereta")).toBe(false);
  });

  it("isMasterKind hanya menerima tiga jenis", () => {
    expect(isMasterKind("area")).toBe(true);
    expect(isMasterKind("source")).toBe(true);
    expect(isMasterKind("category")).toBe(true);
    expect(isMasterKind("user")).toBe(false);
    expect(isMasterKind(undefined)).toBe(false);
  });
});

describe("masterDataRules: toMasterItem", () => {
  it("memetakan jumlah pemakaian dan kolom opsional kategori", () => {
    const area = toMasterItem({ id: "a1", name: "Daop 1 Jakarta", isActive: true, _count: { complaints: 4 } });
    expect(area).toEqual({ id: "a1", name: "Daop 1 Jakarta", isActive: true, usageCount: 4 });

    const cat = toMasterItem({
      id: "c1",
      name: "Fasilitas",
      isActive: false,
      slaHours: 48,
      description: null,
      _count: { complaints: 0 },
    });
    expect(cat.slaHours).toBe(48);
    expect(cat.description).toBeNull();
    expect(cat.usageCount).toBe(0);
  });
});
