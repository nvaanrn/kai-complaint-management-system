import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  holiday: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { holiday: mocks.holiday } }));

import { createHoliday, updateHoliday, deleteHoliday } from "@/app/actions/holidays";
import { Role } from "@/types/database";

const admin = { id: "u1", name: "Admin", nipp: "9987459001", role: Role.ADMIN };
const pic = { id: "u2", name: "PIC", nipp: "9987459002", role: Role.PIC };

describe("Server action hari libur: hak akses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("menolak jika belum login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const res = await createHoliday({ date: "2026-12-25", name: "Natal" });
    expect(res.code).toBe("UNAUTHENTICATED");
    expect(mocks.holiday.create).not.toHaveBeenCalled();
  });

  it("menolak non-Admin untuk tambah, ubah, dan hapus", async () => {
    mocks.getCurrentUser.mockResolvedValue(pic);
    const c = await createHoliday({ date: "2026-12-25", name: "Natal" });
    const u = await updateHoliday("h1", { name: "Baru" });
    const d = await deleteHoliday("h1");
    expect([c.code, u.code, d.code]).toEqual(["FORBIDDEN", "FORBIDDEN", "FORBIDDEN"]);
    expect(mocks.holiday.create).not.toHaveBeenCalled();
    expect(mocks.holiday.update).not.toHaveBeenCalled();
    expect(mocks.holiday.delete).not.toHaveBeenCalled();
  });
});

describe("Server action hari libur: tambah", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(admin);
  });

  it("menyimpan tanggal sebagai Date UTC tengah malam dan nama yang dirapikan", async () => {
    mocks.holiday.create.mockResolvedValue({ id: "h1" });
    const res = await createHoliday({ date: "2026-12-25", name: "  Hari Raya   Natal " });
    expect(res.success).toBe(true);
    expect(mocks.holiday.create).toHaveBeenCalledWith({
      data: { date: new Date("2026-12-25T00:00:00.000Z"), name: "Hari Raya Natal" },
    });
  });

  it("menolak tanggal tidak valid dan nama kosong", async () => {
    const a = await createHoliday({ date: "2026-02-30", name: "X" });
    const b = await createHoliday({ date: "2026-12-25", name: "  " });
    expect([a.code, b.code]).toEqual(["VALIDATION_ERROR", "VALIDATION_ERROR"]);
    expect(mocks.holiday.create).not.toHaveBeenCalled();
  });

  it("tanggal yang sudah terdaftar menghasilkan DUPLICATE", async () => {
    mocks.holiday.create.mockRejectedValue({ code: "P2002" });
    const res = await createHoliday({ date: "2026-12-25", name: "Natal" });
    expect(res.success).toBe(false);
    expect(res.code).toBe("DUPLICATE");
  });
});

describe("Server action hari libur: ubah dan hapus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(admin);
  });

  it("data yang tidak ada menghasilkan NOT_FOUND", async () => {
    mocks.holiday.findUnique.mockResolvedValue(null);
    expect((await updateHoliday("x", { name: "Baru" })).code).toBe("NOT_FOUND");
    expect((await deleteHoliday("x")).code).toBe("NOT_FOUND");
  });

  it("mengubah nama saja", async () => {
    mocks.holiday.findUnique.mockResolvedValue({ id: "h1" });
    mocks.holiday.update.mockResolvedValue({});
    const res = await updateHoliday("h1", { name: "Natal 2026" });
    expect(res.success).toBe(true);
    expect(mocks.holiday.update).toHaveBeenCalledWith({ where: { id: "h1" }, data: { name: "Natal 2026" } });
  });

  it("mengubah tanggal harus valid", async () => {
    mocks.holiday.findUnique.mockResolvedValue({ id: "h1" });
    const bad = await updateHoliday("h1", { date: "2026-99-99" });
    expect(bad.code).toBe("VALIDATION_ERROR");
    expect(mocks.holiday.update).not.toHaveBeenCalled();

    mocks.holiday.update.mockResolvedValue({});
    const ok = await updateHoliday("h1", { date: "2026-12-26" });
    expect(ok.success).toBe(true);
    expect(mocks.holiday.update).toHaveBeenCalledWith({
      where: { id: "h1" },
      data: { date: new Date("2026-12-26T00:00:00.000Z") },
    });
  });

  it("tanpa perubahan tidak menulis ke database", async () => {
    mocks.holiday.findUnique.mockResolvedValue({ id: "h1" });
    const res = await updateHoliday("h1", {});
    expect(res.success).toBe(true);
    expect(mocks.holiday.update).not.toHaveBeenCalled();
  });

  it("menghapus hari libur yang ada", async () => {
    mocks.holiday.findUnique.mockResolvedValue({ id: "h1" });
    mocks.holiday.delete.mockResolvedValue({});
    const res = await deleteHoliday("h1");
    expect(res.success).toBe(true);
    expect(mocks.holiday.delete).toHaveBeenCalledWith({ where: { id: "h1" } });
  });
});
