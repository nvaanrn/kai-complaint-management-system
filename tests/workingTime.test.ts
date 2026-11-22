import { describe, it, expect } from "vitest";
import {
  addWorkingHours,
  workingHoursBetween,
  workingHoursPerDay,
  toDayKey,
} from "@/lib/workingTime";

// Pembantu: tulis waktu dalam WIB. 23 November 2026 adalah hari Senin.
const wib = (text: string) => new Date(`${text.replace(" ", "T")}:00+07:00`);
const show = (d: Date) => d.toISOString();

describe("workingTime: toDayKey (WIB)", () => {
  it("memakai tanggal WIB, bukan UTC", () => {
    // 06:00 WIB = 23:00 UTC hari sebelumnya
    expect(toDayKey(wib("2026-11-23 06:00"))).toBe("2026-11-23");
    expect(toDayKey(wib("2026-11-23 23:30"))).toBe("2026-11-23");
  });
});

describe("workingTime: addWorkingHours", () => {
  it("jam kerja per hari adalah 8 pada konfigurasi awal", () => {
    expect(workingHoursPerDay()).toBe(8);
  });

  it("menambah jam di dalam satu hari kerja", () => {
    expect(show(addWorkingHours(wib("2026-11-23 09:00"), 2))).toBe(show(wib("2026-11-23 11:00")));
  });

  it("melewati waktu istirahat (12:00 - 13:00) tanpa menghitungnya", () => {
    expect(show(addWorkingHours(wib("2026-11-23 11:00"), 2))).toBe(show(wib("2026-11-23 14:00")));
  });

  it("melanjutkan ke hari kerja berikutnya", () => {
    expect(show(addWorkingHours(wib("2026-11-23 16:00"), 2))).toBe(show(wib("2026-11-24 09:00")));
  });

  it("melewati akhir pekan", () => {
    // Jumat 27 Nov 16:00 + 2 jam: 1 jam Jumat, 1 jam Senin
    expect(show(addWorkingHours(wib("2026-11-27 16:00"), 2))).toBe(show(wib("2026-11-30 09:00")));
  });

  it("mulai pada hari Sabtu dihitung dari Senin pagi", () => {
    expect(show(addWorkingHours(wib("2026-11-28 10:00"), 1))).toBe(show(wib("2026-11-30 09:00")));
  });

  it("mulai sebelum jam kerja dihitung dari jam buka", () => {
    expect(show(addWorkingHours(wib("2026-11-23 06:00"), 1))).toBe(show(wib("2026-11-23 09:00")));
  });

  it("mulai setelah jam kerja dihitung dari hari kerja berikutnya", () => {
    expect(show(addWorkingHours(wib("2026-11-23 20:00"), 1))).toBe(show(wib("2026-11-24 09:00")));
  });

  it("mulai saat istirahat dihitung dari pukul 13:00", () => {
    expect(show(addWorkingHours(wib("2026-11-23 12:30"), 1))).toBe(show(wib("2026-11-23 14:00")));
  });

  it("melewati hari libur", () => {
    // Selasa 24 Nov libur: Senin 16:00 + 2 jam -> 1 jam Senin, 1 jam Rabu
    const res = addWorkingHours(wib("2026-11-23 16:00"), 2, ["2026-11-24"]);
    expect(show(res)).toBe(show(wib("2026-11-25 09:00")));
  });

  it("batas tepat: 8 jam dari 08:00 jatuh pada 17:00, 9 jam pada hari berikutnya", () => {
    expect(show(addWorkingHours(wib("2026-11-23 08:00"), 8))).toBe(show(wib("2026-11-23 17:00")));
    expect(show(addWorkingHours(wib("2026-11-23 08:00"), 9))).toBe(show(wib("2026-11-24 09:00")));
  });

  it("24 jam kerja dari Senin 09:00 jatuh pada Kamis 09:00", () => {
    expect(show(addWorkingHours(wib("2026-11-23 09:00"), 24))).toBe(show(wib("2026-11-26 09:00")));
  });

  it("mendukung jam pecahan dan nol jam", () => {
    expect(show(addWorkingHours(wib("2026-11-23 09:00"), 1.5))).toBe(show(wib("2026-11-23 10:30")));
    const start = wib("2026-11-23 09:15");
    expect(show(addWorkingHours(start, 0))).toBe(show(start));
  });

  it("tidak mengubah objek waktu awal", () => {
    const start = wib("2026-11-23 09:00");
    const before = start.getTime();
    addWorkingHours(start, 5);
    expect(start.getTime()).toBe(before);
  });

  it("menolak jam negatif atau bukan angka", () => {
    expect(() => addWorkingHours(wib("2026-11-23 09:00"), -1)).toThrow();
    expect(() => addWorkingHours(wib("2026-11-23 09:00"), Number.NaN)).toThrow();
  });
});

describe("workingTime: workingHoursBetween", () => {
  it("menghitung jam kerja dalam satu hari", () => {
    expect(workingHoursBetween(wib("2026-11-23 09:00"), wib("2026-11-23 11:00"))).toBe(2);
  });

  it("tidak menghitung waktu istirahat", () => {
    expect(workingHoursBetween(wib("2026-11-23 11:00"), wib("2026-11-23 14:00"))).toBe(2);
  });

  it("tidak menghitung akhir pekan", () => {
    expect(workingHoursBetween(wib("2026-11-27 16:00"), wib("2026-11-30 09:00"))).toBe(2);
  });

  it("tidak menghitung hari libur", () => {
    expect(workingHoursBetween(wib("2026-11-23 16:00"), wib("2026-11-25 09:00"), ["2026-11-24"])).toBe(2);
  });

  it("hasil nol jika akhir tidak setelah awal", () => {
    expect(workingHoursBetween(wib("2026-11-23 11:00"), wib("2026-11-23 09:00"))).toBe(0);
    expect(workingHoursBetween(wib("2026-11-23 11:00"), wib("2026-11-23 11:00"))).toBe(0);
  });

  it("konsisten dengan addWorkingHours untuk berbagai waktu awal dan durasi", () => {
    const starts = [
      "2026-11-23 09:00",
      "2026-11-23 13:30",
      "2026-11-23 16:45",
      "2026-11-27 15:00",
      "2026-11-28 10:00",
      "2026-11-23 06:00",
      "2026-11-23 20:00",
    ];
    const durations = [1, 3, 8, 20, 48];
    for (const s of starts) {
      for (const h of durations) {
        const end = addWorkingHours(wib(s), h, ["2026-11-25"]);
        expect(workingHoursBetween(wib(s), end, ["2026-11-25"])).toBeCloseTo(h, 9);
      }
    }
  });
});
