"use server";

import { prisma } from "@/lib/prisma";
import { ComplaintStatus, Role, VerificationResult } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// 1. Generate nomor keluhan otomatis: CMP-YYYY-XXX
async function generateComplaintNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CMP-${currentYear}-`;

  const lastComplaint = await prisma.complaint.findFirst({
    where: {
      complaintNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      complaintNumber: "desc",
    },
    select: {
      complaintNumber: true,
    },
  });

  let nextSequence = 1;
  if (lastComplaint?.complaintNumber) {
    const parts = lastComplaint.complaintNumber.split("-");
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) {
      nextSequence = lastNum + 1;
    }
  }

  const paddedNum = String(nextSequence).padStart(3, "0");
  return `${prefix}${paddedNum}`;
}

// 2. Server Action: Catat Keluhan Baru (Admin)
export async function createComplaint(formData: {
  customerName: string;
  source: string;
  description: string;
  date?: string;
  picId?: string | null;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { success: false, error: "Unauthorized. Silakan login terlebih dahulu." };
  }

  // Sesuai SOP KAI: Hanya Admin (atau staf berwenang) yang mencatat keluhan
  try {
    const complaintNumber = await generateComplaintNumber();
    const complaintDate = formData.date ? new Date(formData.date) : new Date();

    const initialStatus = formData.picId
      ? ComplaintStatus.DALAM_PENANGANAN
      : ComplaintStatus.BELUM_DITANGANI;

    const newComplaint = await prisma.complaint.create({
      data: {
        complaintNumber,
        customerName: formData.customerName.trim(),
        source: formData.source,
        description: formData.description.trim(),
        date: complaintDate,
        status: initialStatus,
        picId: formData.picId && formData.picId !== "" ? formData.picId : null,
      },
    });

    revalidatePath("/dashboard");
    return { success: true, data: newComplaint };
  } catch (error: any) {
    console.error("Error creating complaint:", error);
    return { success: false, error: error.message || "Gagal mencatat keluhan baru." };
  }
}

// 3. Server Action: Menugaskan PIC (Admin)
export async function assignPIC(complaintId: string, picId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return { success: false, error: "Hanya Admin yang berwenang menentukan penugasan PIC." };
  }

  try {
    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        picId: picId || null,
        status: picId ? ComplaintStatus.DALAM_PENANGANAN : ComplaintStatus.BELUM_DITANGANI,
      },
    });

    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error assigning PIC:", error);
    return { success: false, error: error.message || "Gagal menugaskan PIC." };
  }
}

// 4. Server Action: Tindakan Penanganan & Submit Verifikasi (Khusus PIC)
export async function updateComplaintProgress(
  complaintId: string,
  data: {
    correctiveAction?: string;
    preventiveAction?: string;
    notes?: string;
    submitForVerification?: boolean;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { success: false, error: "Unauthorized." };
  }

  // Sesuai SOP KAI: Hanya PIC yang berwenang mengisi tindakan penanganan dan mengajukan verifikasi
  if (session.user.role !== Role.PIC) {
    return {
      success: false,
      error: "Hanya petugas PIC yang berwenang melakukan tindakan penanganan dan pengajuan verifikasi.",
    };
  }

  try {
    const updateData: any = {};

    const corrective = data.correctiveAction?.trim();
    const preventive = data.preventiveAction?.trim();

    // Validasi: Form tidak boleh kosong
    if (!corrective && !preventive) {
      return {
        success: false,
        error: "Formulir tindakan penanganan tidak boleh kosong. Harap isi tindakan perbaikan.",
      };
    }

    // Validasi submit verifikasi: Wajib diisi keduanya
    if (data.submitForVerification) {
      if (!corrective || !preventive) {
        return {
          success: false,
          error: "Tindakan perbaikan dan tindakan pencegahan wajib diisi sebelum diajukan untuk verifikasi.",
        };
      }
      updateData.status = ComplaintStatus.MENUNGGU_VERIFIKASI;
    } else {
      // Pastikan tetap DALAM_PENANGANAN
      const current = await prisma.complaint.findUnique({
        where: { id: complaintId },
        select: { status: true },
      });
      if (current?.status === ComplaintStatus.BELUM_DITANGANI) {
        updateData.status = ComplaintStatus.DALAM_PENANGANAN;
      }
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: updateData,
    });

    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating complaint progress:", error);
    return { success: false, error: error.message || "Gagal memperbarui status keluhan." };
  }
}

// 5. Server Action: Verifikasi Keluhan (Khusus Verifikator)
export async function verifyComplaint(
  complaintId: string,
  data: {
    result: VerificationResult;
    feedback?: string;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { success: false, error: "Unauthorized." };
  }

  // Sesuai aturan KAI: Verifikasi hanya oleh Verifikator (Admin tidak melakukan verifikasi)
  if (session.user.role !== Role.VERIFIKATOR && session.user.role !== Role.ADMIN) {
    return { success: false, error: "Hanya Verifikator yang berwenang melakukan verifikasi mutu keluhan." };
  }

  // Jika Ditolak, alasan reject WAJIB diisi
  if (data.result === VerificationResult.REJECTED && (!data.feedback || data.feedback.trim() === "")) {
    return { success: false, error: "Alasan penolakan / feedback perbaikan wajib diisi saat menolak keluhan." };
  }

  try {
    // 1. Catat ke histori verifikasi tanpa menimpa data lama
    await prisma.verification.create({
      data: {
        complaintId,
        verifierId: session.user.id,
        result: data.result,
        feedback: data.feedback?.trim() || null,
      },
    });

    // 2. Tentukan status baru:
    // Approve: MENUNGGU VERIFIKASI -> TERVERIFIKASI
    // Reject: MENUNGGU VERIFIKASI -> kembali ke DALAM PENANGANAN
    const newStatus =
      data.result === VerificationResult.APPROVED
        ? ComplaintStatus.TERVERIFIKASI
        : ComplaintStatus.DALAM_PENANGANAN;

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: newStatus,
        notes: data.feedback ? `[Catatan Verifikasi]: ${data.feedback.trim()}` : undefined,
      },
    });

    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error verifying complaint:", error);
    return { success: false, error: error.message || "Gagal memproses verifikasi." };
  }
}

// 6. Server Action: Buat Dokumen Rekapitulasi FR.SM/TI/033.001
export async function createDocumentBatch(data: {
  complaintIds: string[];
  documentNumber?: string;
  managementRep: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { success: false, error: "Unauthorized." };
  }

  if (!data.complaintIds || data.complaintIds.length === 0) {
    return { success: false, error: "Pilih minimal 1 keluhan untuk dimasukkan ke dalam dokumen." };
  }

  try {
    const docNumber = data.documentNumber || `FR.SM/TI/033.001/${new Date().getMonth() + 1}-${new Date().getFullYear()}`;

    const newDoc = await prisma.document.create({
      data: {
        documentNumber: docNumber,
        version: "002-2020",
        documentDate: new Date(),
        createdById: session.user.id,
        managementRep: data.managementRep || "Management Representative KAI",
        complaints: {
          connect: data.complaintIds.map((id) => ({ id })),
        },
      },
      include: {
        complaints: true,
      },
    });

    revalidatePath("/dashboard");
    return { success: true, data: newDoc };
  } catch (error: any) {
    console.error("Error creating document batch:", error);
    return { success: false, error: error.message || "Gagal membuat dokumen rekapitulasi." };
  }
}

// 7. Server Action: Hapus Keluhan (Khusus Admin)
export async function deleteComplaint(complaintId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return { success: false, error: "Hanya Admin yang berwenang menghapus data keluhan." };
  }

  try {
    const deleted = await prisma.complaint.delete({
      where: { id: complaintId },
    });

    revalidatePath("/dashboard");
    return { success: true, data: deleted };
  } catch (error: any) {
    console.error("Error deleting complaint:", error);
    return { success: false, error: error.message || "Gagal menghapus keluhan." };
  }
}

// 8. Server Action: Edit Data Pokok Keluhan (Khusus Admin)
export async function editComplaintDetails(
  complaintId: string,
  data: {
    customerName?: string;
    source?: string;
    date?: string;
    description?: string;
    picId?: string | null;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return { success: false, error: "Hanya Admin yang berwenang mengedit data registrasi keluhan." };
  }

  try {
    const updateData: any = {};
    if (data.customerName) updateData.customerName = data.customerName.trim();
    if (data.source) updateData.source = data.source;
    if (data.date) updateData.date = new Date(data.date);
    if (data.description) updateData.description = data.description.trim();
    if (data.picId !== undefined) {
      updateData.picId = data.picId && data.picId !== "" ? data.picId : null;
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: updateData,
    });

    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error editing complaint details:", error);
    return { success: false, error: error.message || "Gagal memperbarui data keluhan." };
  }
}
