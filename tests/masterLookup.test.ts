import { describe, it, expect, vi } from "vitest";
import { findMasterByName, findCategoryForNewComplaint } from "@/lib/masterLookup";

function makeClient() {
  return {
    operationalArea: { findFirst: vi.fn() },
    complaintSource: { findFirst: vi.fn() },
    complaintCategoryMaster: { findFirst: vi.fn(), findUnique: vi.fn() },
  };
}

describe("masterLookup: findMasterByName", () => {
  it("mencari wilayah aktif berdasarkan nama yang sudah dirapikan", async () => {
    const client = makeClient();
    client.operationalArea.findFirst.mockResolvedValue({ id: "a1", name: "Daop 1 Jakarta" });
    const res = await findMasterByName(client, "area", "  Daop 1 Jakarta ", { activeOnly: true });
    expect(res).toEqual({ id: "a1", name: "Daop 1 Jakarta" });
    expect(client.operationalArea.findFirst).toHaveBeenCalledWith({
      where: { name: "Daop 1 Jakarta", isActive: true },
    });
  });

  it("mencari sumber tanpa syarat aktif untuk menyinkronkan data lama", async () => {
    const client = makeClient();
    client.complaintSource.findFirst.mockResolvedValue({ id: "s1", name: "Lainnya" });
    await findMasterByName(client, "source", "Lainnya", { activeOnly: false });
    expect(client.complaintSource.findFirst).toHaveBeenCalledWith({ where: { name: "Lainnya" } });
  });

  it("mengembalikan null untuk nama kosong tanpa menyentuh database", async () => {
    const client = makeClient();
    const res = await findMasterByName(client, "area", "   ", { activeOnly: true });
    expect(res).toBeNull();
    expect(client.operationalArea.findFirst).not.toHaveBeenCalled();
  });

  it("mengembalikan null jika data tidak ditemukan atau nonaktif", async () => {
    const client = makeClient();
    client.complaintSource.findFirst.mockResolvedValue(null);
    expect(await findMasterByName(client, "source", "Tidak Ada", { activeOnly: true })).toBeNull();
  });
});

describe("masterLookup: findCategoryForNewComplaint", () => {
  it("memakai id kategori terpilih yang aktif", async () => {
    const client = makeClient();
    client.complaintCategoryMaster.findFirst.mockResolvedValue({ id: "c2", name: "Fasilitas Kereta", slaHours: 48 });
    const res = await findCategoryForNewComplaint(client, " c2 ");
    expect(res?.slaHours).toBe(48);
    expect(client.complaintCategoryMaster.findFirst).toHaveBeenCalledWith({
      where: { id: "c2", isActive: true },
    });
  });

  it("kategori terpilih yang nonaktif atau tidak ada menghasilkan null", async () => {
    const client = makeClient();
    client.complaintCategoryMaster.findFirst.mockResolvedValue(null);
    expect(await findCategoryForNewComplaint(client, "c-hilang")).toBeNull();
  });

  it("tanpa pilihan kategori hasilnya null (kategori wajib dipilih, tidak ada fallback otomatis)", async () => {
    const client = makeClient();
    expect(await findCategoryForNewComplaint(client, undefined)).toBeNull();
    expect(await findCategoryForNewComplaint(client, "   ")).toBeNull();
    expect(client.complaintCategoryMaster.findFirst).not.toHaveBeenCalled();
    expect(client.complaintCategoryMaster.findUnique).not.toHaveBeenCalled();
  });
});
