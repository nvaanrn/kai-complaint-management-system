import { describe, it, expect, vi } from "vitest";
import { loadHolidayKeys } from "@/lib/holidayLookup";

describe("holidayLookup: loadHolidayKeys", () => {
  it("mengubah baris hari libur menjadi kunci tanggal", async () => {
    const client = {
      holiday: {
        findMany: vi.fn().mockResolvedValue([
          { date: new Date("2026-12-25T00:00:00.000Z") },
          { date: new Date("2026-12-24T00:00:00.000Z") },
        ]),
      },
    };
    expect(await loadHolidayKeys(client)).toEqual(["2026-12-25", "2026-12-24"]);
    expect(client.holiday.findMany).toHaveBeenCalledWith({ select: { date: true } });
  });

  it("mengembalikan daftar kosong jika belum ada hari libur", async () => {
    const client = { holiday: { findMany: vi.fn().mockResolvedValue([]) } };
    expect(await loadHolidayKeys(client)).toEqual([]);
  });
});
