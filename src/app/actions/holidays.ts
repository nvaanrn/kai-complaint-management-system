"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@/types/database";
import { MasterActionResult } from "@/lib/masterDataRules";
import {
  HolidayInput,
  dateKeyToUtcDate,
  validateHolidayDate,
  validateHolidayName,
} from "@/lib/holidayRules";

function fail(error: string, code: string): MasterActionResult {
  return { success: false, error, code };
}

async function adminGuard(): Promise<MasterActionResult | null> {
  const user = await getCurrentUser();
  if (!user) {
    return fail("Sesi tidak valid. Silakan login kembali.", "UNAUTHENTICATED");
  }
  if (user.role !== Role.ADMIN) {
    return fail("Hanya Admin yang berwenang mengelola hari libur.", "FORBIDDEN");
  }
  return null;
}

function mapError(error: any): MasterActionResult {
  if (error?.code === "P2002") {
    return fail("Tanggal tersebut sudah terdaftar sebagai hari libur.", "DUPLICATE");
  }
  console.error("Kesalahan pengelolaan hari libur:", error);
  return fail("Terjadi kesalahan saat memproses hari libur.", "INTERNAL_ERROR");
}

// Catatan: mengubah daftar libur hanya memengaruhi keluhan yang dicatat sesudahnya.
// Tenggat keluhan yang sudah tersimpan tidak dihitung ulang.

export async function createHoliday(input: { date: string; name: string }): Promise<MasterActionResult> {
  const denied = await adminGuard();
  if (denied) return denied;

  const date = validateHolidayDate(input?.date);
  if (!date.valid) return fail(date.error as string, "VALIDATION_ERROR");
  const name = validateHolidayName(input?.name);
  if (!name.valid) return fail(name.error as string, "VALIDATION_ERROR");

  try {
    await prisma.holiday.create({ data: { date: dateKeyToUtcDate(date.value), name: name.value } });
    revalidatePath("/dashboard");
    return { success: true, message: "Hari libur berhasil ditambahkan." };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateHoliday(id: string, input: HolidayInput): Promise<MasterActionResult> {
  const denied = await adminGuard();
  if (denied) return denied;

  try {
    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (!existing) return fail("Hari libur tidak ditemukan.", "NOT_FOUND");

    const data: { date?: Date; name?: string } = {};
    if (input.date !== undefined) {
      const date = validateHolidayDate(input.date);
      if (!date.valid) return fail(date.error as string, "VALIDATION_ERROR");
      data.date = dateKeyToUtcDate(date.value);
    }
    if (input.name !== undefined) {
      const name = validateHolidayName(input.name);
      if (!name.valid) return fail(name.error as string, "VALIDATION_ERROR");
      data.name = name.value;
    }
    if (Object.keys(data).length === 0) {
      return { success: true, message: "Tidak ada perubahan." };
    }

    await prisma.holiday.update({ where: { id }, data });
    revalidatePath("/dashboard");
    return { success: true, message: "Hari libur berhasil diperbarui." };
  } catch (error) {
    return mapError(error);
  }
}

export async function deleteHoliday(id: string): Promise<MasterActionResult> {
  const denied = await adminGuard();
  if (denied) return denied;

  try {
    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (!existing) return fail("Hari libur tidak ditemukan.", "NOT_FOUND");

    await prisma.holiday.delete({ where: { id } });
    revalidatePath("/dashboard");
    return { success: true, message: "Hari libur berhasil dihapus." };
  } catch (error) {
    return mapError(error);
  }
}
