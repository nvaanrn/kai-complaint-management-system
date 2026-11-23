import { describe, it, expect } from "vitest";
import {
  validateHolidayDate,
  validateHolidayName,
  dateKeyToUtcDate,
  utcDateToKey,
  formatHolidayDate,
  isWeekendKey,
  toHolidayItem,
} from "@/lib/holidayRules";

describe("holidayRules: validateHolidayDate", () => {
  it("menerima tanggal kalender yang valid", () => {
    expect(validateHolidayDate("2026-12-25").valid).toBe(true);
    expect(validateHolidayDate("2028-02-29").valid).toBe(true); // tahun kabisat
  });

  it("menolak format salah, tanggal yang tidak ada, dan nilai kosong", () => {
    expect(validateHolidayDate("25-12-2026").valid).toBe(false);
    expect(validateHolidayDate("2026-02-30").valid).toBe(false);
    expect(validateHolidayDate("2027-02-29").valid).toBe(false); // bukan tahun kabisat
    expect(validateHolidayDate("2026-13-01").valid).toBe(false);
    expect(validateHolidayDate("").valid).toBe(false);
    expect(validateHolidayDate(undefined).valid).toBe(false);
  });

  it("menolak tahun di luar rentang", () => {
    expect(validateHolidayDate("1999-12-31").valid).toBe(false);
    expect(validateHolidayDate("2101-01-01").valid).toBe(false);
  });
});

describe("holidayRules: validateHolidayName", () => {
  it("merapikan spasi dan menolak kosong atau terlalu panjang", () => {
    expect(validateHolidayName("  Hari   Raya  Natal ").value).toBe("Hari Raya Natal");
    expect(validateHolidayName("   ").valid).toBe(false);
    expect(validateHolidayName(undefined).valid).toBe(false);
    expect(validateHolidayName("a".repeat(121)).valid).toBe(false);
    expect(validateHolidayName("a".repeat(120)).valid).toBe(true);
  });
});

describe("holidayRules: tanggal", () => {
  it("kunci tanggal dan Date UTC saling bolak-balik tanpa bergeser hari", () => {
    const d = dateKeyToUtcDate("2026-12-25");
    expect(d.toISOString()).toBe("2026-12-25T00:00:00.000Z");
    expect(utcDateToKey(d)).toBe("2026-12-25");
  });

  it("memformat tanggal dalam bahasa Indonesia", () => {
    expect(formatHolidayDate("2026-11-24")).toBe("Selasa, 24 November 2026");
    expect(formatHolidayDate("2026-12-25")).toBe("Jumat, 25 Desember 2026");
  });

  it("mengenali akhir pekan", () => {
    expect(isWeekendKey("2026-11-28")).toBe(true); // Sabtu
    expect(isWeekendKey("2026-11-29")).toBe(true); // Minggu
    expect(isWeekendKey("2026-11-24")).toBe(false); // Selasa
  });

  it("toHolidayItem memetakan baris database", () => {
    expect(toHolidayItem({ id: "h1", date: new Date("2026-12-25T00:00:00.000Z"), name: "Natal" })).toEqual({
      id: "h1",
      date: "2026-12-25",
      name: "Natal",
    });
  });
});
