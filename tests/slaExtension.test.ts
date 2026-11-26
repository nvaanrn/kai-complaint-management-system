import { describe, it, expect } from "vitest";
import { validateExtraWorkingDays, computeExtensionDeadline } from "@/lib/slaExtension";

// 23 November 2026 adalah hari Senin. Waktu ditulis dalam WIB.
const wib = (text: string) => new Date(`${text.replace(" ", "T")}:00+07:00`);

describe("slaExtension: validateExtraWorkingDays", () => {
  it("menerima bilangan bulat 1 sampai 30", () => {
    expect(validateExtraWorkingDays(1).valid).toBe(true);
    expect(validateExtraWorkingDays(7).valid).toBe(true);
    expect(validateExtraWorkingDays(30).valid).toBe(true);
  });

  it("menolak kosong, nol, negatif, pecahan, di atas batas, dan bukan angka", () => {
    for (const bad of [undefined, null, "", "2", 0, -1, 1.5, 31, Number.NaN]) {
      expect(validateExtraWorkingDays(bad).valid).toBe(false);
    }
  });
});

describe("slaExtension: computeExtensionDeadline", () => {
  it("tenggat baru = saat penolakan + hari kerja, jam tetap sama", () => {
    const res = computeExtensionDeadline(wib("2026-11-23 14:05"), 2);
    expect(res.toISOString()).toBe(wib("2026-11-25 14:05").toISOString());
  });

  it("melewati akhir pekan dan hari libur", () => {
    expect(computeExtensionDeadline(wib("2026-11-27 10:00"), 1).toISOString()).toBe(wib("2026-11-30 10:00").toISOString());
    expect(computeExtensionDeadline(wib("2026-11-23 10:00"), 1, ["2026-11-24"]).toISOString()).toBe(
      wib("2026-11-25 10:00").toISOString()
    );
  });
});
