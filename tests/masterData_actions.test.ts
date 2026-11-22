import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const delegate = () => ({
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  });
  return {
    getCurrentUser: vi.fn(),
    area: delegate(),
    source: delegate(),
    category: delegate(),
    complaintCount: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    operationalArea: mocks.area,
    complaintSource: mocks.source,
    complaintCategoryMaster: mocks.category,
    complaint: { count: mocks.complaintCount },
  },
}));

import { createMasterItem, updateMasterItem, deleteMasterItem } from "@/app/actions/masterData";
import { Role } from "@/types/database";

const admin = { id: "u-admin", name: "Admin", nipp: "9987459001", role: Role.ADMIN };
const pic = { id: "u-pic", name: "PIC", nipp: "9987459002", role: Role.PIC };
const verifikator = { id: "u-ver", name: "Verif", nipp: "9987459003", role: Role.VERIFIKATOR };

describe("Server action master data: hak akses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak jika belum login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const res = await createMasterItem("area", { name: "Daop Baru" });
    expect(res.success).toBe(false);
    expect(res.code).toBe("UNAUTHENTICATED");
    expect(mocks.area.create).not.toHaveBeenCalled();
  });

  it("menolak PIC dan Verifikator untuk semua aksi", async () => {
    for (const user of [pic, verifikator]) {
      mocks.getCurrentUser.mockResolvedValue(user);
      const c = await createMasterItem("area", { name: "Daop Baru" });
      const u = await updateMasterItem("area", "a1", { isActive: false });
      const d = await deleteMasterItem("area", "a1");
      expect([c.code, u.code, d.code]).toEqual(["FORBIDDEN", "FORBIDDEN", "FORBIDDEN"]);
    }
    expect(mocks.area.create).not.toHaveBeenCalled();
    expect(mocks.area.update).not.toHaveBeenCalled();
    expect(mocks.area.delete).not.toHaveBeenCalled();
  });
});

describe("Server action master data: tambah", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(admin);
  });

  it("Admin dapat menambah wilayah dengan nama yang dirapikan", async () => {
    mocks.area.create.mockResolvedValue({ id: "a-new" });
    const res = await createMasterItem("area", { name: "  Daop 10   Baru " });
    expect(res.success).toBe(true);
    expect(mocks.area.create).toHaveBeenCalledWith({ data: { name: "Daop 10 Baru" } });
  });

  it("menolak nama kosong", async () => {
    const res = await createMasterItem("source", { name: "   " });
    expect(res.success).toBe(false);
    expect(res.code).toBe("VALIDATION_ERROR");
    expect(mocks.source.create).not.toHaveBeenCalled();
  });

  it("nama duplikat dari database menghasilkan pesan DUPLICATE", async () => {
    mocks.area.create.mockRejectedValue({ code: "P2002" });
    const res = await createMasterItem("area", { name: "Daop 1 Jakarta" });
    expect(res.success).toBe(false);
    expect(res.code).toBe("DUPLICATE");
  });

  it("kategori wajib punya target SLA yang valid", async () => {
    const bad = await createMasterItem("category", { name: "Fasilitas", slaHours: 0 });
    expect(bad.success).toBe(false);
    expect(bad.code).toBe("VALIDATION_ERROR");
    expect(mocks.category.create).not.toHaveBeenCalled();

    mocks.category.create.mockResolvedValue({ id: "c-new" });
    const ok = await createMasterItem("category", { name: "Fasilitas", slaHours: 48, description: " AC dan toilet " });
    expect(ok.success).toBe(true);
    expect(mocks.category.create).toHaveBeenCalledWith({
      data: { name: "Fasilitas", slaHours: 48, description: "AC dan toilet" },
    });
  });

  it("menolak jenis master yang tidak dikenal", async () => {
    const res = await createMasterItem("user" as any, { name: "X" });
    expect(res.success).toBe(false);
    expect(res.code).toBe("VALIDATION_ERROR");
  });
});

describe("Server action master data: ubah", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(admin);
  });

  it("Admin dapat menonaktifkan wilayah", async () => {
    mocks.area.findUnique.mockResolvedValue({ id: "a1", name: "Daop 1 Jakarta" });
    mocks.area.update.mockResolvedValue({});
    const res = await updateMasterItem("area", "a1", { isActive: false });
    expect(res.success).toBe(true);
    expect(mocks.area.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { isActive: false } });
  });

  it("data yang tidak ada menghasilkan NOT_FOUND", async () => {
    mocks.source.findUnique.mockResolvedValue(null);
    const res = await updateMasterItem("source", "x", { name: "Baru" });
    expect(res.code).toBe("NOT_FOUND");
  });

  it("kategori bawaan tidak boleh diganti nama atau dinonaktifkan", async () => {
    mocks.category.findUnique.mockResolvedValue({ id: "c1", name: "Umum / Belum Dikategorikan" });
    const rename = await updateMasterItem("category", "c1", { name: "Lain" });
    const off = await updateMasterItem("category", "c1", { isActive: false });
    expect(rename.code).toBe("PROTECTED");
    expect(off.code).toBe("PROTECTED");
    expect(mocks.category.update).not.toHaveBeenCalled();
  });

  it("target SLA kategori bawaan tetap boleh diubah", async () => {
    mocks.category.findUnique.mockResolvedValue({ id: "c1", name: "Umum / Belum Dikategorikan" });
    mocks.category.update.mockResolvedValue({});
    const res = await updateMasterItem("category", "c1", { slaHours: 36 });
    expect(res.success).toBe(true);
    expect(mocks.category.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { slaHours: 36 } });
  });

  it("tanpa perubahan tidak menulis ke database", async () => {
    mocks.source.findUnique.mockResolvedValue({ id: "s1", name: "Lainnya" });
    const res = await updateMasterItem("source", "s1", { name: "Lainnya" });
    expect(res.success).toBe(true);
    expect(mocks.source.update).not.toHaveBeenCalled();
  });
});

describe("Server action master data: hapus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(admin);
  });

  it("data yang sudah dipakai keluhan dinonaktifkan, bukan dihapus", async () => {
    mocks.area.findUnique.mockResolvedValue({ id: "a1", name: "Daop 1 Jakarta" });
    mocks.complaintCount.mockResolvedValue(3);
    mocks.area.update.mockResolvedValue({});
    const res = await deleteMasterItem("area", "a1");
    expect(res.success).toBe(true);
    expect(res.data?.deactivated).toBe(true);
    expect(res.data?.usageCount).toBe(3);
    expect(mocks.area.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { isActive: false } });
    expect(mocks.area.delete).not.toHaveBeenCalled();
    expect(mocks.complaintCount).toHaveBeenCalledWith({ where: { areaId: "a1" } });
  });

  it("data yang belum dipakai dihapus permanen", async () => {
    mocks.source.findUnique.mockResolvedValue({ id: "s9", name: "Survei" });
    mocks.complaintCount.mockResolvedValue(0);
    mocks.source.delete.mockResolvedValue({});
    const res = await deleteMasterItem("source", "s9");
    expect(res.success).toBe(true);
    expect(res.data?.deleted).toBe(true);
    expect(mocks.source.delete).toHaveBeenCalledWith({ where: { id: "s9" } });
    expect(mocks.complaintCount).toHaveBeenCalledWith({ where: { sourceId: "s9" } });
  });

  it("kategori bawaan tidak dapat dihapus", async () => {
    mocks.category.findUnique.mockResolvedValue({ id: "c1", name: "Umum / Belum Dikategorikan" });
    const res = await deleteMasterItem("category", "c1");
    expect(res.code).toBe("PROTECTED");
    expect(mocks.category.delete).not.toHaveBeenCalled();
    expect(mocks.category.update).not.toHaveBeenCalled();
  });
});
