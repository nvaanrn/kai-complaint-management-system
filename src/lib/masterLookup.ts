/**
 * Pencarian data master untuk validasi di server (createComplaint, editComplaintDetails).
 * Parameter client adalah prisma atau transaksi (tx).
 */

export type NamedMasterKind = "area" | "source";

export async function findMasterByName(
  client: any,
  kind: NamedMasterKind,
  name: string,
  opts: { activeOnly: boolean }
): Promise<{ id: string; name: string } | null> {
  const clean = name.trim();
  if (!clean) return null;
  const where = opts.activeOnly ? { name: clean, isActive: true } : { name: clean };
  const row =
    kind === "area"
      ? await client.operationalArea.findFirst({ where })
      : await client.complaintSource.findFirst({ where });
  return row ?? null;
}

// Keluhan baru: kategori wajib dipilih lewat id dan harus aktif (tidak ada pilihan otomatis).
export async function findCategoryForNewComplaint(
  client: any,
  categoryId?: string | null
): Promise<{ id: string; name: string; slaHours: number } | null> {
  const id = categoryId?.trim();
  if (!id) return null;
  const row = await client.complaintCategoryMaster.findFirst({ where: { id, isActive: true } });
  return row ?? null;
}
