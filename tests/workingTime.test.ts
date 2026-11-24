import { describe, it, expect } from "vitest";
import {
  addWorkingDays,
  workingDaysBetween,
  isWorkingDay,
  toDayKey,
} from "@/lib/workingTime";

// 23 November 2026 adalah hari Senin. Waktu ditulis dalam WIB.
const wib = (text: string) => new Date(`${text.replace(" ", "T")}:00+07:00`);
const iso = (d: Date) => d.toISOString();

describe("workingTime: toDayKey dan isWorkingDay (WIB)", () => {
  it("memakai tanggal WIB, bukan UTC", () => {
    expect(toDayKey(wib("2026-11-23 06:00"))).toBe("2026-11-23"); // 23:00 UTC hari sebelumnya
    expect(toDayKey(wib("2026-11-23 23:30"))).toBe("2026-11-23");
  });

  it("mengenali hari kerja, akhir pekan, dan hari libur", () => {
    expect(isWorkingDay(wib("2026-11-23 10:00"))).toBe(true); // Senin
    expect(isWorkingDay(wib("2026-11-28 10:00"))).toBe(false); // Sabtu
    expect(isWorkingDay(wib("2026-11-29 10:00"))).toBe(false); // Minggu
    expect(isWorkingDay(wib("2026-11-24 10:00"), ["2026-11-24"])).toBe(false); // libur
  });
});

describe("workingTime: addWorkingDays", () => {
  it("1 hari kerja: Senin 14:05 menjadi Selasa 14:05 (jam sama)", () => {
    expect(iso(addWorkingDays(wib("2026-11-23 14:05"), 1))).toBe(iso(wib("2026-11-24 14:05")));
  });

  it("2 hari kerja dari Senin jatuh pada Rabu", () => {
    expect(iso(addWorkingDays(wib("2026-11-23 14:05"), 2))).toBe(iso(wib("2026-11-25 14:05")));
  });

  it("melewati akhir pekan: Jumat 14:05 + 1 hari kerja = Senin 14:05", () => {
    expect(iso(addWorkingDays(wib("2026-11-27 14:05"), 1))).toBe(iso(wib("2026-11-30 14:05")));
  });

  it("5 hari kerja sama dengan satu minggu penuh", () => {
    expect(iso(addWorkingDays(wib("2026-11-23 09:00"), 5))).toBe(iso(wib("2026-11-30 09:00")));
  });

  it("dicatat di akhir pekan: hari kerja pertama sesudahnya dihitung hari ke-1", () => {
    expect(iso(addWorkingDays(wib("2026-11-28 10:00"), 1))).toBe(iso(wib("2026-11-30 10:00"))); // Sabtu
    expect(iso(addWorkingDays(wib("2026-11-29 10:00"), 1))).toBe(iso(wib("2026-11-30 10:00"))); // Minggu
    expect(iso(addWorkingDays(wib("2026-11-28 10:00"), 2))).toBe(iso(wib("2026-12-01 10:00")));
  });

  it("melewati hari libur", () => {
    // Selasa 24 Nov libur: Senin + 1 hari kerja = Rabu
    expect(iso(addWorkingDays(wib("2026-11-23 14:05"), 1, ["2026-11-24"]))).toBe(iso(wib("2026-11-25 14:05")));
    // Senin 30 Nov libur: Jumat + 1 hari kerja = Selasa
    expect(iso(addWorkingDays(wib("2026-11-27 10:00"), 1, ["2026-11-30"]))).toBe(iso(wib("2026-12-01 10:00")));
  });

  it("jam tetap sama walau tanggal UTC berbeda dengan WIB", () => {
    // 06:00 WIB = 23:00 UTC hari sebelumnya
    expect(iso(addWorkingDays(wib("2026-11-23 06:00"), 1))).toBe(iso(wib("2026-11-24 06:00")));
  });

  it("mempertahankan detik dan milidetik", () => {
    const start = new Date("2026-11-23T07:05:45.130Z");
    const end = addWorkingDays(start, 2);
    expect(iso(end)).toBe("2026-11-25T07:05:45.130Z");
  });

  it("nol hari mengembalikan waktu awal; objek awal tidak diubah", () => {
    const start = wib("2026-11-23 09:15");
    const before = start.getTime();
    expect(iso(addWorkingDays(start, 0))).toBe(iso(start));
    addWorkingDays(start, 5);
    expect(start.getTime()).toBe(before);
  });

  it("menolak hari negatif, pecahan, atau bukan angka", () => {
    expect(() => addWorkingDays(wib("2026-11-23 09:00"), -1)).toThrow();
    expect(() => addWorkingDays(wib("2026-11-23 09:00"), 1.5)).toThrow();
    expect(() => addWorkingDays(wib("2026-11-23 09:00"), Number.NaN)).toThrow();
  });
});

describe("workingTime: workingDaysBetween", () => {
  it("menghitung hari kerja penuh yang terlewati", () => {
    expect(workingDaysBetween(wib("2026-11-23 14:00"), wib("2026-11-24 14:00"))).toBe(1);
    expect(workingDaysBetween(wib("2026-11-23 14:00"), wib("2026-11-24 13:59"))).toBe(0);
    expect(workingDaysBetween(wib("2026-11-23 14:00"), wib("2026-11-30 14:00"))).toBe(5);
  });

  it("tidak menghitung akhir pekan", () => {
    expect(workingDaysBetween(wib("2026-11-27 10:00"), wib("2026-11-30 10:00"))).toBe(1);
    expect(workingDaysBetween(wib("2026-11-27 10:00"), wib("2026-12-01 10:00"))).toBe(2);
  });

  it("tidak menghitung hari libur", () => {
    expect(workingDaysBetween(wib("2026-11-23 10:00"), wib("2026-11-25 10:00"), ["2026-11-24"])).toBe(1);
  });

  it("hasil nol jika akhir tidak setelah awal", () => {
    expect(workingDaysBetween(wib("2026-11-24 10:00"), wib("2026-11-23 10:00"))).toBe(0);
    expect(workingDaysBetween(wib("2026-11-23 10:00"), wib("2026-11-23 10:00"))).toBe(0);
  });

  it("konsisten dengan addWorkingDays untuk berbagai waktu awal dan jumlah hari", () => {
    const holidays = ["2026-11-25", "2026-12-25"];
    const starts = [
      "2026-11-23 09:00",
      "2026-11-23 16:45",
      "2026-11-27 15:00",
      "2026-11-28 10:00",
      "2026-11-29 22:00",
      "2026-11-23 06:00",
    ];
    for (const s of starts) {
      for (const n of [1, 2, 3, 5, 10, 22]) {
        const end = addWorkingDays(wib(s), n, holidays);
        expect(workingDaysBetween(wib(s), end, holidays)).toBe(n);
      }
    }
  });
});
