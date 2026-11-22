import { describe, it, expect } from "vitest";
import {
  DEFAULT_CATEGORY_NAME,
  buildSelectOptions,
  LEGACY_CATEGORIES,
  legacyCategoryFromName,
  selectableCategories,
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

describe("masterDataRules: buildSelectOptions", () => {
  const items = [
    { id: "1", name: "Daop 1 Jakarta", isActive: true, usageCount: 2 },
    { id: "2", name: "Daop Lama", isActive: false, usageCount: 5 },
    { id: "3", name: "Daop 2 Bandung", isActive: true, usageCount: 0 },
  ];

  it("hanya menampilkan master yang aktif", () => {
    expect(buildSelectOptions(items)).toEqual(["Daop 1 Jakarta", "Daop 2 Bandung"]);
  });

  it("menambahkan nilai keluhan yang sedang dipakai walau master-nya nonaktif", () => {
    expect(buildSelectOptions(items, "Daop Lama")).toEqual(["Daop 1 Jakarta", "Daop 2 Bandung", "Daop Lama"]);
  });

  it("menambahkan nilai lama yang tidak ada di master, tanpa menggandakan yang sudah ada", () => {
    expect(buildSelectOptions(items, "Telepon")).toContain("Telepon");
    expect(buildSelectOptions(items, "Daop 1 Jakarta")).toEqual(["Daop 1 Jakarta", "Daop 2 Bandung"]);
  });

  it("mengabaikan nilai kosong atau null", () => {
    expect(buildSelectOptions(items, "")).toEqual(["Daop 1 Jakarta", "Daop 2 Bandung"]);
    expect(buildSelectOptions(items, null)).toEqual(["Daop 1 Jakarta", "Daop 2 Bandung"]);
  });
});

describe("masterDataRules: kategori lama dipertahankan", () => {
  it("memuat ketujuh kategori lama dengan kode enum aslinya", () => {
    expect(LEGACY_CATEGORIES.map((c) => c.code)).toEqual([
      "KESELAMATAN_KEAMANAN",
      "FASILITAS_KERETA",
      "FASILITAS_STASIUN",
      "TIKET_DAN_SISTEM",
      "PELAYANAN_PETUGAS",
      "REFUND_DAN_TARIF",
      "INFORMASI_DAN_LAINNYA",
    ]);
  });

  it("memetakan nama master kembali ke kode enum lama", () => {
    expect(legacyCategoryFromName("Fasilitas Kereta")).toBe("FASILITAS_KERETA");
    expect(legacyCategoryFromName("  refund   dan tarif ")).toBe("REFUND_DAN_TARIF");
    expect(legacyCategoryFromName("Kategori Buatan Admin")).toBeNull();
    expect(legacyCategoryFromName(null)).toBeNull();
  });

  it("kategori yang boleh dipilih: aktif dan bukan kategori cadangan sistem", () => {
    const items = [
      { id: "1", name: DEFAULT_CATEGORY_NAME, isActive: true, usageCount: 4, slaHours: 24 },
      { id: "2", name: "Fasilitas Kereta", isActive: true, usageCount: 0, slaHours: 24 },
      { id: "3", name: "Kategori Lama", isActive: false, usageCount: 1, slaHours: 24 },
    ];
    expect(selectableCategories(items).map((i) => i.id)).toEqual(["2"]);
  });
});
