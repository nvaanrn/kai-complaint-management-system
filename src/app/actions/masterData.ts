"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@/types/database";
import {
  MasterKind,
  MasterActionResult,
  MasterItemInput,
  MASTER_LABELS,
  isMasterKind,
  validateMasterName,
  validateSlaDays,
  daysToHours,
  normalizeDescription,
  isProtectedMasterItem,
  decideDeleteAction,
} from "@/lib/masterDataRules";

function fail(error: string, code: string): MasterActionResult<never> {
  return { success: false, error, code };
}

async function adminGuard(): Promise<MasterActionResult<never> | null> {
  const user = await getCurrentUser();
  if (!user) {
    return fail("Sesi tidak valid. Silakan login kembali.", "UNAUTHENTICATED");
  }
  if (user.role !== Role.ADMIN) {
    return fail("Hanya Admin yang berwenang mengelola data master.", "FORBIDDEN");
  }
  return null;
}

function delegate(kind: MasterKind): any {
  switch (kind) {
    case "area":
      return prisma.operationalArea;
    case "source":
      return prisma.complaintSource;
    case "category":
      return prisma.complaintCategoryMaster;
  }
}

async function countUsage(kind: MasterKind, id: string): Promise<number> {
  const where =
    kind === "area" ? { areaId: id } : kind === "source" ? { sourceId: id } : { categoryId: id };
  return prisma.complaint.count({ where });
}

function mapError(error: any): MasterActionResult<never> {
  if (error?.code === "P2002") {
    return fail("Nama tersebut sudah dipakai. Gunakan nama lain (huruf besar/kecil dianggap sama).", "DUPLICATE");
  }
  console.error("Kesalahan pengelolaan data master:", error);
  return fail("Terjadi kesalahan saat memproses data master.", "INTERNAL_ERROR");
}

// 1. Tambah data master (Admin)
export async function createMasterItem(
  kind: MasterKind,
  input: { name: string; slaDays?: number; description?: string | null }
): Promise<MasterActionResult> {
  const denied = await adminGuard();
  if (denied) return denied;
  if (!isMasterKind(kind)) return fail("Jenis data master tidak valid.", "VALIDATION_ERROR");

  const name = validateMasterName(input?.name);
  if (!name.valid) return fail(name.error as string, "VALIDATION_ERROR");

  const data: Record<string, unknown> = { name: name.value };
  if (kind === "category") {
    const sla = validateSlaDays(input.slaDays);
    if (!sla.valid) return fail(sla.error as string, "VALIDATION_ERROR");
    data.slaHours = daysToHours(sla.value);
    data.description = normalizeDescription(input.description);
  }

  try {
    const item = await delegate(kind).create({ data });
    revalidatePath("/dashboard");
    return { success: true, data: { id: item?.id }, message: `${MASTER_LABELS[kind]} berhasil ditambahkan.` };
  } catch (error) {
    return mapError(error);
  }
}

// 2. Ubah data master: nama, status aktif, dan (untuk kategori) target SLA serta deskripsi (Admin)
export async function updateMasterItem(
  kind: MasterKind,
  id: string,
  input: MasterItemInput
): Promise<MasterActionResult> {
  const denied = await adminGuard();
  if (denied) return denied;
  if (!isMasterKind(kind)) return fail("Jenis data master tidak valid.", "VALIDATION_ERROR");

  try {
    const existing = await delegate(kind).findUnique({ where: { id } });
    if (!existing) return fail("Data tidak ditemukan.", "NOT_FOUND");

    const protectedItem = isProtectedMasterItem(kind, existing.name);
    const data: Record<string, unknown> = {};

    if (input.name !== undefined) {
      const name = validateMasterName(input.name);
      if (!name.valid) return fail(name.error as string, "VALIDATION_ERROR");
      if (name.value !== existing.name) {
        if (protectedItem) {
          return fail("Kategori bawaan sistem tidak dapat diganti namanya.", "PROTECTED");
        }
        data.name = name.value;
      }
    }

    if (input.isActive !== undefined) {
      if (protectedItem && input.isActive === false) {
        return fail("Kategori bawaan sistem tidak dapat dinonaktifkan.", "PROTECTED");
      }
      data.isActive = Boolean(input.isActive);
    }

    if (kind === "category") {
      if (input.slaDays !== undefined) {
        const sla = validateSlaDays(input.slaDays);
        if (!sla.valid) return fail(sla.error as string, "VALIDATION_ERROR");
        data.slaHours = daysToHours(sla.value);
      }
      if (input.description !== undefined) {
        data.description = normalizeDescription(input.description);
      }
    }

    if (Object.keys(data).length === 0) {
      return { success: true, message: "Tidak ada perubahan." };
    }

    await delegate(kind).update({ where: { id }, data });
    revalidatePath("/dashboard");
    return { success: true, message: `${MASTER_LABELS[kind]} berhasil diperbarui.` };
  } catch (error) {
    return mapError(error);
  }
}

// 3. Hapus data master (Admin). Data yang sudah dipakai keluhan dinonaktifkan, bukan dihapus.
export async function deleteMasterItem(
  kind: MasterKind,
  id: string
): Promise<MasterActionResult<{ deleted?: boolean; deactivated?: boolean; usageCount?: number }>> {
  const denied = await adminGuard();
  if (denied) return denied;
  if (!isMasterKind(kind)) return fail("Jenis data master tidak valid.", "VALIDATION_ERROR");

  try {
    const existing = await delegate(kind).findUnique({ where: { id } });
    if (!existing) return fail("Data tidak ditemukan.", "NOT_FOUND");

    if (isProtectedMasterItem(kind, existing.name)) {
      return fail("Kategori bawaan sistem tidak dapat dihapus.", "PROTECTED");
    }

    const usageCount = await countUsage(kind, id);

    if (decideDeleteAction(usageCount) === "DEACTIVATE") {
      await delegate(kind).update({ where: { id }, data: { isActive: false } });
      revalidatePath("/dashboard");
      return {
        success: true,
        data: { deactivated: true, usageCount },
        message: `Data sudah dipakai ${usageCount} keluhan sehingga tidak dihapus, melainkan dinonaktifkan. Riwayat keluhan tetap utuh.`,
      };
    }

    await delegate(kind).delete({ where: { id } });
    revalidatePath("/dashboard");
    return { success: true, data: { deleted: true, usageCount: 0 }, message: "Data berhasil dihapus." };
  } catch (error) {
    return mapError(error);
  }
}
