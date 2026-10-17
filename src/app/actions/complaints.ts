"use server";

import { prisma } from "@/lib/prisma";
import {
  ComplaintStatus,
  Role,
  VerificationResult,
  ComplaintCategory,
  AuditAction,
  ReopenStatus,
  DocumentStatus,
} from "@/types/database";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  validateComplaintInput,
  validatePicExecutionInput,
  validateVerificationInput,
  validateReopenRequestInput,
  validateReopenReviewInput,
} from "@/lib/validation";
import { formatComplaintNumber, parseNextSequence } from "@/lib/complaintNumber";
import { Permissions } from "@/lib/permissions";
import { validateStateTransition } from "@/lib/state-machine";

export interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// 1. Helper internal: Generate nomor keluhan otomatis CMP-YYYY-XXXX
// Menggunakan ComplaintCounter atomik untuk menghindari duplikasi pada permintaan bersamaan.
async function generateComplaintNumber(client: any): Promise<string> {
  const currentYear = new Date().getFullYear();

  // Atomic upsert+increment: jika baris tahun belum ada, buat dengan lastSequence=1.
  // Jika sudah ada, increment lastSequence secara atomik di level database.
  const counter = await client.complaintCounter.upsert({
    where: { year: currentYear },
    create: { year: currentYear, lastSequence: 1 },
    update: { lastSequence: { increment: 1 } },
  });

  return formatComplaintNumber(currentYear, counter.lastSequence);
}


// 2. Server Action: Registrasi Keluhan Baru (Khusus Admin)
export async function createComplaint(formData: {
  customerName: string;
  customerContact?: string;
  daopOrStation?: string;
  source: string;
  category?: string;
  description: string;
  date?: string;
  picId?: string | null;
}): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Sesi tidak valid. Silakan login kembali.", code: "UNAUTHENTICATED" };
  }

  // RBAC Server-Side: Hanya Admin yang berwenang meregistrasi keluhan
  if (user.role !== Role.ADMIN) {
    return { success: false, error: "Hanya Admin yang berwenang mencatat keluhan baru.", code: "FORBIDDEN" };
  }

  // Validasi Input Server-Side
  const validation = validateComplaintInput({
    customerName: formData.customerName,
    description: formData.description,
    source: formData.source,
    category: formData.category,
  });

  if (!validation.isValid) {
    return { success: false, error: validation.firstError, code: "VALIDATION_ERROR" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil nomor keluhan unik
      const complaintNumber = await generateComplaintNumber(tx);
      const complaintDate = formData.date ? new Date(formData.date) : new Date();

      // 2. Verifikasi penugasan PIC awal jika diisi
      let assignedPicId: string | null = null;
      let assignedAt: Date | null = null;
      let initialStatus = ComplaintStatus.BELUM_DITANGANI;

      if (formData.picId && formData.picId.trim() !== "") {
        const picUser = await tx.user.findUnique({
          where: { id: formData.picId },
          select: { id: true, role: true },
        });

        if (!picUser || (picUser.role !== Role.PIC && picUser.role !== Role.ADMIN)) {
          throw new Error("Petugas yang dipilih tidak valid atau bukan PIC.");
        }

        assignedPicId = picUser.id;
        assignedAt = new Date();
        initialStatus = ComplaintStatus.DALAM_PENANGANAN;
      }

      // 3. Buat baris keluhan baru
      const newComplaint = await tx.complaint.create({
        data: {
          complaintNumber,
          customerName: formData.customerName.trim(),
          customerContact: formData.customerContact?.trim() || null,
          daopOrStation: formData.daopOrStation?.trim() || null,
          source: formData.source,
          category: (formData.category as ComplaintCategory) || null,
          description: formData.description.trim(),
          date: complaintDate,
          status: initialStatus,
          picId: assignedPicId,
          assignedAt,
        },
      });

      // 5. Catat Audit Log
      await tx.auditLog.create({
        data: {
          complaintId: newComplaint.id,
          userId: user.id,
          action: AuditAction.CREATE_COMPLAINT,
          entity: "Complaint",
          entityId: newComplaint.id,
          details: {
            complaintNumber,
            category: formData.category,
            status: initialStatus,
            picId: assignedPicId,
          },
        },
      });

      return newComplaint;
    });

    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error creating complaint:", error);
    return {
      success: false,
      error: error.message || "Gagal mencatat keluhan baru.",
      code: error.code || "INTERNAL_ERROR",
    };
  }
}

// 3. Server Action: Menugaskan / Mengganti PIC (Khusus Admin)
export async function assignPIC(complaintId: string, picId: string): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Sesi tidak valid.", code: "UNAUTHENTICATED" };
  }

  // RBAC Server-Side: Hanya Admin yang berwenang menugaskan PIC
  if (!Permissions.canAssignPIC(user)) {
    return { success: false, error: "Hanya Admin yang berwenang menentukan penugasan PIC.", code: "FORBIDDEN" };
  }

  if (!complaintId || complaintId.trim() === "") {
    return { success: false, error: "ID keluhan tidak valid.", code: "VALIDATION_ERROR" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil keluhan dan validasi status saat ini di dalam transaksi
      const complaint = await tx.complaint.findUnique({
        where: { id: complaintId },
        select: { id: true, status: true, picId: true, complaintNumber: true },
      });

      if (!complaint) {
        throw new Error("Data keluhan tidak ditemukan.");
      }

      // Validasi State Machine: Dilarang mengganti PIC saat verifikasi atau setelah selesai
      if (complaint.status === ComplaintStatus.MENUNGGU_VERIFIKASI) {
        throw new Error("Tidak dapat mengubah penugasan saat keluhan sedang dalam proses verifikasi.");
      }
      if (complaint.status === ComplaintStatus.TERVERIFIKASI) {
        throw new Error("Keluhan telah terverifikasi dan selesai. Tidak dapat mengubah penugasan PIC.");
      }

      // 2. Validasi PIC tujuan
      const cleanPicId = picId ? picId.trim() : "";
      let targetUserId: string | null = null;
      let newStatus = complaint.status;

      if (cleanPicId !== "") {
        const targetUser = await tx.user.findUnique({
          where: { id: cleanPicId },
          select: { id: true, role: true },
        });

        if (!targetUser || (targetUser.role !== Role.PIC && targetUser.role !== Role.ADMIN)) {
          throw new Error("Petugas yang dipilih tidak valid atau bukan PIC.");
        }

        targetUserId = targetUser.id;
        newStatus = ComplaintStatus.DALAM_PENANGANAN;
      } else {
        // Jika PIC dikosongkan
        targetUserId = null;
        newStatus = ComplaintStatus.BELUM_DITANGANI;
      }

      // 3. Update keluhan
      const updated = await tx.complaint.update({
        where: { id: complaintId },
        data: {
          picId: targetUserId,
          status: newStatus,
          assignedAt: targetUserId ? new Date() : null,
        },
      });

      // 4. Catat Audit Log
      await tx.auditLog.create({
        data: {
          complaintId,
          userId: user.id,
          action: AuditAction.ASSIGN_PIC,
          entity: "Complaint",
          entityId: complaintId,
          details: {
            oldPicId: complaint.picId,
            newPicId: targetUserId,
            newStatus,
          },
        },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error assigning PIC:", error);
    return {
      success: false,
      error: error.message || "Gagal memproses penugasan PIC.",
      code: "INTERNAL_ERROR",
    };
  }
}

// 4. Server Action: Tindakan Penanganan & Submit Verifikasi (Khusus PIC yang Ditugaskan)
export async function updateComplaintProgress(
  complaintId: string,
  data: {
    correctiveAction?: string;
    preventiveAction?: string;
    notes?: string;
    proofImageUrl?: string | null;
    submitForVerification?: boolean;
  }
): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Sesi tidak valid.", code: "UNAUTHENTICATED" };
  }

  // RBAC Server-Side: Hanya PIC (atau Admin superuser) yang berwenang
  if (user.role !== Role.PIC && user.role !== Role.ADMIN) {
    return {
      success: false,
      error: "Hanya petugas PIC yang berwenang melakukan tindakan penanganan dan pengajuan verifikasi.",
      code: "FORBIDDEN",
    };
  }

  // Validasi Input Server-Side
  const validation = validatePicExecutionInput(data);
  if (!validation.isValid) {
    return { success: false, error: validation.firstError, code: "VALIDATION_ERROR" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil keluhan di dalam transaksi untuk mencegah kondisi balapan
      const complaint = await tx.complaint.findUnique({
        where: { id: complaintId },
        select: {
          id: true,
          picId: true,
          status: true,
          submissionCount: true,
        },
      });

      if (!complaint) {
        throw new Error("Data keluhan tidak ditemukan.");
      }

      // Validasi Kepemilikan (Ownership): PIC hanya boleh mengeksekusi keluhan miliknya
      if (user.role === Role.PIC && complaint.picId !== user.id) {
        throw new Error("Akses ditolak. Anda hanya berwenang mengeksekusi keluhan yang ditugaskan kepada Anda.");
      }

      // Validasi Status: Dilarang update jika sedang menunggu verifikasi atau sudah terverifikasi
      if (complaint.status === ComplaintStatus.MENUNGGU_VERIFIKASI) {
        throw new Error("Keluhan sedang dalam proses verifikasi oleh tim mutu dan tidak dapat diubah.");
      }
      if (complaint.status === ComplaintStatus.TERVERIFIKASI) {
        throw new Error("Keluhan telah terverifikasi selesai dan terkunci.");
      }

      // 2. Siapkan data mutasi
      const corrective = data.correctiveAction?.trim();
      const preventive = data.preventiveAction?.trim();
      const updateData: any = {};

      if (corrective !== undefined) updateData.correctiveAction = corrective;
      if (preventive !== undefined) updateData.preventiveAction = preventive;
      if (data.notes !== undefined) updateData.notes = data.notes.trim();
      if (data.proofImageUrl !== undefined) updateData.proofImageUrl = data.proofImageUrl;

      let auditAction = AuditAction.SAVE_PROGRESS;

      if (data.submitForVerification) {
        // Validasi State Machine untuk Submit Verifikasi
        const transition = validateStateTransition(
          complaint.status as any as ComplaintStatus,
          AuditAction.SUBMIT_VERIFICATION,
          user.role
        );

        if (!transition.isAllowed) {
          throw new Error(transition.error || "Transisi status ke MENUNGGU_VERIFIKASI tidak sah.");
        }

        updateData.status = ComplaintStatus.MENUNGGU_VERIFIKASI;
        updateData.submittedAt = new Date();
        updateData.submissionCount = (complaint.submissionCount || 0) + 1;
        auditAction = AuditAction.SUBMIT_VERIFICATION;
      } else {
        // Simpan draf
        if (complaint.status === ComplaintStatus.BELUM_DITANGANI) {
          updateData.status = ComplaintStatus.DALAM_PENANGANAN;
        }
      }

      // 3. Eksekusi update
      const updated = await tx.complaint.update({
        where: { id: complaintId },
        data: updateData,
      });

      // 4. Catat Audit Log
      await tx.auditLog.create({
        data: {
          complaintId,
          userId: user.id,
          action: auditAction,
          entity: "Complaint",
          entityId: complaintId,
          details: {
            submitForVerification: data.submitForVerification,
            newStatus: updateData.status || complaint.status,
            submissionCount: updateData.submissionCount,
          },
        },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error updating complaint progress:", error);
    return {
      success: false,
      error: error.message || "Gagal memperbarui status keluhan.",
      code: "INTERNAL_ERROR",
    };
  }
}

// 5. Server Action: Verifikasi Mutu Keluhan (Eksklusif Role VERIFIKATOR)
export async function verifyComplaint(
  complaintId: string,
  data: {
    result: VerificationResult;
    feedback?: string;
  }
): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Sesi tidak valid.", code: "UNAUTHENTICATED" };
  }

  // RBAC Server-Side: Mutlak hanya Verifikator (Admin DILARANG KERAS memverifikasi - Four-Eyes Principle)
  if (!Permissions.canVerifyComplaint(user)) {
    return {
      success: false,
      error: "Hanya Verifikator yang berwenang melakukan verifikasi mutu keluhan (SOP KAI four-eyes principle).",
      code: "FORBIDDEN",
    };
  }

  // Validasi Input Server-Side
  const validation = validateVerificationInput(data);
  if (!validation.isValid) {
    return { success: false, error: validation.firstError, code: "VALIDATION_ERROR" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil keluhan di dalam transaksi & kunci status saat ini
      const complaint = await tx.complaint.findUnique({
        where: { id: complaintId },
        select: {
          id: true,
          status: true,
          picId: true,
          submissionCount: true,
        },
      });

      if (!complaint) {
        throw new Error("Data keluhan tidak ditemukan.");
      }

      // Validasi Konkurensi & State Machine: Status WAJIB MENUNGGU_VERIFIKASI
      if (complaint.status !== ComplaintStatus.MENUNGGU_VERIFIKASI) {
        throw new Error(
          "Keluhan tidak sedang dalam status MENUNGGU_VERIFIKASI atau telah diproses oleh verifikator lain."
        );
      }

      const isApproved = data.result === VerificationResult.APPROVED;
      const targetAction = isApproved ? AuditAction.VERIFY_APPROVED : AuditAction.VERIFY_REJECTED;

      const transition = validateStateTransition(
        complaint.status as any as ComplaintStatus,
        targetAction,
        user.role
      );
      if (!transition.isAllowed) {
        throw new Error(transition.error || "Keputusan verifikasi tidak sah untuk status keluhan saat ini.");
      }

      // 2. Catat rekaman verifikasi immutable (siklus putaran baru)
      const currentCycle = complaint.submissionCount && complaint.submissionCount > 0
        ? complaint.submissionCount
        : 1;

      await tx.verification.create({
        data: {
          complaintId,
          verifierId: user.id,
          result: data.result,
          feedback: data.feedback?.trim() || null,
          cycle: currentCycle,
          verifiedAt: new Date(),
        },
      });

      // 3. Tentukan status tujuan dan mutasi keluhan
      let newStatus: ComplaintStatus;
      let completedAt: Date | null = null;

      if (isApproved) {
        newStatus = ComplaintStatus.TERVERIFIKASI;
        completedAt = new Date();
      } else {
        // PENOLAKAN: Status kembali ke DALAM_PENANGANAN, PIC TETAP SAMA (tidak berubah/tidak dihapus)
        newStatus = ComplaintStatus.DALAM_PENANGANAN;
        completedAt = null;
      }

      const updated = await tx.complaint.update({
        where: { id: complaintId },
        data: {
          status: newStatus,
          completedAt,
          // picId TIDAK diubah, tetap mengacu ke PIC sebelumnya
        },
      });

      // 4. Catat Audit Log
      await tx.auditLog.create({
        data: {
          complaintId,
          userId: user.id,
          action: targetAction,
          entity: "Complaint",
          entityId: complaintId,
          details: {
            result: data.result,
            feedback: data.feedback?.trim(),
            cycle: currentCycle,
            newStatus,
          },
        },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error verifying complaint:", error);
    return {
      success: false,
      error: error.message || "Gagal memproses verifikasi keluhan.",
      code: "INTERNAL_ERROR",
    };
  }
}

// 6. Server Action: Permohonan Pembukaan Kembali Keluhan (Reopen Request)
export async function requestReopenComplaint(
  complaintId: string,
  reason: string
): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Sesi tidak valid.", code: "UNAUTHENTICATED" };
  }

  // Validasi Input Server-Side
  const validation = validateReopenRequestInput({ reason });
  if (!validation.isValid) {
    return { success: false, error: validation.firstError, code: "VALIDATION_ERROR" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil keluhan di dalam transaksi
      const complaint = await tx.complaint.findUnique({
        where: { id: complaintId },
        select: { id: true, status: true, complaintNumber: true, picId: true },
      });

      if (!complaint) {
        throw new Error("Data keluhan tidak ditemukan.");
      }

      // RBAC & State: Hanya keluhan yang sudah TERVERIFIKASI yang dapat diajukan reopen
      if (!Permissions.canRequestReopen(user, complaint as any)) {
        throw new Error(
          "Hanya keluhan yang telah berstatus TERVERIFIKASI yang dapat diajukan untuk dibuka kembali."
        );
      }

      // 2. Cek apakah ada permohonan reopen yang sedang pending
      const existingPending = await tx.reopenRequest.findFirst({
        where: {
          complaintId,
          status: ReopenStatus.PENDING,
        },
      });

      if (existingPending) {
        throw new Error("Permohonan pembukaan kembali untuk keluhan ini sedang menunggu peninjauan Admin.");
      }

      // 3. Buat rekaman permohonan Reopen
      const reopenReq = await tx.reopenRequest.create({
        data: {
          complaintId,
          requestedById: user.id,
          reason: reason.trim(),
          status: ReopenStatus.PENDING,
        },
      });

      // 4. Catat Audit Log
      await tx.auditLog.create({
        data: {
          complaintId,
          userId: user.id,
          action: AuditAction.REQUEST_REOPEN,
          entity: "ReopenRequest",
          entityId: reopenReq.id,
          details: {
            reason: reason.trim(),
          },
        },
      });

      return reopenReq;
    });

    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error requesting reopen:", error);
    return {
      success: false,
      error: error.message || "Gagal mengajukan pembukaan kembali keluhan.",
      code: "INTERNAL_ERROR",
    };
  }
}

// 7. Server Action: Keputusan Persetujuan / Penolakan Pembukaan Kembali (Khusus Admin)
export async function reviewReopenRequest(
  requestId: string,
  data: {
    decision: "APPROVED" | "REJECTED";
    adminNotes: string;
  }
): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Sesi tidak valid.", code: "UNAUTHENTICATED" };
  }

  // RBAC Server-Side: Mutlak hanya Admin
  if (!Permissions.canReviewReopen(user)) {
    return {
      success: false,
      error: "Hanya Admin yang berwenang menyetujui atau menolak pembukaan kembali keluhan.",
      code: "FORBIDDEN",
    };
  }

  // Validasi Input Server-Side
  const validation = validateReopenReviewInput(data);
  if (!validation.isValid) {
    return { success: false, error: validation.firstError, code: "VALIDATION_ERROR" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil permohonan reopen di dalam transaksi
      const reopenReq = await tx.reopenRequest.findUnique({
        where: { id: requestId },
        include: { complaint: true },
      });

      if (!reopenReq) {
        throw new Error("Permohonan pembukaan kembali tidak ditemukan.");
      }

      if (reopenReq.status !== ReopenStatus.PENDING) {
        throw new Error("Permohonan ini telah ditinjau sebelumnya dan tidak dapat diproses ulang.");
      }

      const isApproved = data.decision === "APPROVED";
      const targetAction = isApproved ? AuditAction.APPROVE_REOPEN : AuditAction.REJECT_REOPEN;

      // 2. Update status ReopenRequest
      const updatedReq = await tx.reopenRequest.update({
        where: { id: requestId },
        data: {
          status: isApproved ? ReopenStatus.APPROVED : ReopenStatus.REJECTED,
          reviewedById: user.id,
          reviewedAt: new Date(),
          adminNotes: data.adminNotes.trim(),
        },
      });

      // 3. Mutasi status keluhan
      if (isApproved) {
        // Disetujui: status kembali ke DALAM_PENANGANAN, PIC TETAP PIC SEBELUMNYA (retensi PIC)
        await tx.complaint.update({
          where: { id: reopenReq.complaintId },
          data: {
            status: ComplaintStatus.DALAM_PENANGANAN,
            completedAt: null,
            // picId TETAP SAMA
          },
        });
      }
      // Jika ditolak, status keluhan tetap TERVERIFIKASI tanpa perubahan

      // 4. Catat Audit Log
      await tx.auditLog.create({
        data: {
          complaintId: reopenReq.complaintId,
          userId: user.id,
          action: targetAction,
          entity: "ReopenRequest",
          entityId: requestId,
          details: {
            decision: data.decision,
            adminNotes: data.adminNotes.trim(),
          },
        },
      });

      return updatedReq;
    });

    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error reviewing reopen request:", error);
    return {
      success: false,
      error: error.message || "Gagal memproses keputusan permohonan reopen.",
      code: "INTERNAL_ERROR",
    };
  }
}

// 8. Server Action: Terbitkan Dokumen Rekapitulasi FR.SM/TI/033.001 (Khusus Admin)
export async function createDocumentBatch(data: {
  complaintIds: string[];
  documentNumber?: string;
  managementRep: string;
}): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Sesi tidak valid.", code: "UNAUTHENTICATED" };
  }

  // RBAC Server-Side: Hanya Admin yang berwenang menerbitkan berkas audit
  if (!Permissions.canGenerateDocument(user)) {
    return { success: false, error: "Hanya Admin yang berwenang menerbitkan dokumen rekapitulasi.", code: "FORBIDDEN" };
  }

  if (!data.complaintIds || data.complaintIds.length === 0) {
    return { success: false, error: "Pilih minimal 1 keluhan untuk dimasukkan ke dalam dokumen.", code: "VALIDATION_ERROR" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil data keluhan beserta verifikator dan PIC untuk dibekukan
      const complaints = await tx.complaint.findMany({
        where: { id: { in: data.complaintIds } },
        include: {
          pic: { select: { name: true, email: true } },
          verifications: {
            orderBy: { verifiedAt: "desc" },
            take: 1,
            include: { verifier: { select: { name: true } } },
          },
        },
      });

      if (complaints.length === 0) {
        throw new Error("Tidak ada data keluhan yang valid untuk diterbitkan.");
      }

      // Validasi Bisnis: Hanya keluhan yang TERVERIFIKASI yang berhak masuk dokumen audit
      const unverified = complaints.filter((c) => c.status !== ComplaintStatus.TERVERIFIKASI);
      if (unverified.length > 0) {
        throw new Error(
          `Keluhan ${unverified[0].complaintNumber} belum berstatus TERVERIFIKASI. Hanya keluhan yang telah diverifikasi tuntas yang dapat diterbitkan.`
        );
      }

      // 2. Buat Snapshot Data Beku (Immutable Snapshot)
      const frozenSnapshot = complaints.map((c) => ({
        complaintId: c.id,
        complaintNumber: c.complaintNumber,
        date: c.date,
        customerName: c.customerName,
        customerContact: c.customerContact,
        daopOrStation: c.daopOrStation,
        source: c.source,
        category: c.category,
        description: c.description,
        picName: c.pic?.name || "Tidak ditentukan",
        correctiveAction: c.correctiveAction,
        preventiveAction: c.preventiveAction,
        proofImageUrl: c.proofImageUrl,
        verifiedAt: c.verifications[0]?.verifiedAt || c.completedAt,
        verifierName: c.verifications[0]?.verifier?.name || "Verifikator Mutu",
      }));

      const docNumber =
        data.documentNumber?.trim() ||
        `FR.SM/TI/033.001/${new Date().getMonth() + 1}-${new Date().getFullYear()}`;

      // 3. Buat dokumen dengan snapshot permanen
      const newDoc = await tx.document.create({
        data: {
          documentNumber: docNumber,
          version: "002-2020",
          revisionNumber: 0,
          status: DocumentStatus.PUBLISHED,
          documentDate: new Date(),
          publishedAt: new Date(),
          createdById: user.id,
          managementRep: data.managementRep?.trim() || "Management Representative KAI",
          snapshotData: frozenSnapshot,
          totalComplaints: complaints.length,
        },
      });

      // 4. Kaitkan keluhan aktif ke dokumen
      await tx.complaint.updateMany({
        where: { id: { in: data.complaintIds } },
        data: { documentId: newDoc.id },
      });

      // 5. Catat Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.GENERATE_DOCUMENT,
          entity: "Document",
          entityId: newDoc.id,
          details: {
            documentNumber: docNumber,
            totalComplaints: complaints.length,
          },
        },
      });

      return newDoc;
    });

    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error creating document batch:", error);
    return {
      success: false,
      error: error.message || "Gagal menerbitkan dokumen rekapitulasi.",
      code: "INTERNAL_ERROR",
    };
  }
}

// 8b. Server Action: Ambil Dokumen Resmi Terbit Berdasarkan Nomor Dokumen
export async function getPublishedDocument(documentNumber: string): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Sesi tidak valid.", code: "UNAUTHENTICATED" };
  }

  try {
    const doc = await prisma.document.findFirst({
      where: { documentNumber: documentNumber.trim() },
      orderBy: { revisionNumber: "desc" },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!doc) {
      return { success: false, error: "Dokumen tidak ditemukan.", code: "NOT_FOUND" };
    }

    return {
      success: true,
      data: doc,
    };
  } catch (error: any) {
    console.error("Error fetching published document:", error);
    return {
      success: false,
      error: error.message || "Gagal mengambil data dokumen arsip.",
      code: "INTERNAL_ERROR",
    };
  }
}

// 8c. Server Action: Ambil Daftar Seluruh Dokumen Terbit
export async function getPublishedDocumentsList(): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Sesi tidak valid.", code: "UNAUTHENTICATED" };
  }

  try {
    const docs = await prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return {
      success: true,
      data: docs,
    };
  } catch (error: any) {
    console.error("Error fetching documents list:", error);
    return {
      success: false,
      error: error.message || "Gagal mengambil daftar dokumen.",
      code: "INTERNAL_ERROR",
    };
  }
}

// 9. Server Action: Hapus Keluhan (Khusus Admin)
export async function deleteComplaint(complaintId: string): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Sesi tidak valid.", code: "UNAUTHENTICATED" };
  }

  // RBAC Server-Side: Hanya Admin yang berwenang
  if (!Permissions.canDeleteComplaint(user)) {
    return { success: false, error: "Hanya Admin yang berwenang menghapus data keluhan.", code: "FORBIDDEN" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const complaint = await tx.complaint.findUnique({
        where: { id: complaintId },
        select: { id: true, complaintNumber: true, documentId: true },
      });

      if (!complaint) {
        throw new Error("Data keluhan tidak ditemukan.");
      }

      // Proteksi Integritas: Dilarang menghapus keluhan yang sudah masuk arsip dokumen terbit
      if (complaint.documentId) {
        throw new Error("Keluhan yang telah tercatat dalam arsip dokumen resmi tidak dapat dihapus.");
      }

      const deleted = await tx.complaint.delete({
        where: { id: complaintId },
      });

      // Catat Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.DELETE_COMPLAINT,
          entity: "Complaint",
          entityId: complaintId,
          details: {
            complaintNumber: complaint.complaintNumber,
          },
        },
      });

      return deleted;
    });

    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error deleting complaint:", error);
    return {
      success: false,
      error: error.message || "Gagal menghapus keluhan.",
      code: "INTERNAL_ERROR",
    };
  }
}

// 10. Server Action: Edit Data Registrasi Keluhan (Khusus Admin)
export async function editComplaintDetails(
  complaintId: string,
  data: {
    customerName?: string;
    customerContact?: string;
    daopOrStation?: string;
    source?: string;
    category?: string;
    date?: string;
    description?: string;
    picId?: string | null;
  }
): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Sesi tidak valid.", code: "UNAUTHENTICATED" };
  }

  // RBAC Server-Side: Hanya Admin yang berwenang
  if (user.role !== Role.ADMIN) {
    return { success: false, error: "Hanya Admin yang berwenang mengedit data registrasi keluhan.", code: "FORBIDDEN" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const complaint = await tx.complaint.findUnique({
        where: { id: complaintId },
        select: { id: true, status: true, picId: true, complaintNumber: true },
      });

      if (!complaint) {
        throw new Error("Data keluhan tidak ditemukan.");
      }

      // Proteksi State: Keluhan TERVERIFIKASI tidak boleh diubah data pokoknya sembarangan
      if (!Permissions.canEditComplaint(user, complaint)) {
        throw new Error("Keluhan yang telah TERVERIFIKASI tidak dapat diubah datanya secara langsung.");
      }

      const updateData: any = {};
      if (data.customerName) {
        const cleanName = data.customerName.trim();
        if (cleanName.length < 3) throw new Error("Nama pelapor minimal 3 karakter.");
        updateData.customerName = cleanName;
      }
      if (data.customerContact !== undefined) {
        updateData.customerContact = data.customerContact.trim() || null;
      }
      if (data.daopOrStation !== undefined) {
        updateData.daopOrStation = data.daopOrStation.trim() || null;
      }
      if (data.source) updateData.source = data.source;
      if (data.category !== undefined) {
        updateData.category = (data.category as ComplaintCategory) || null;
      }
      if (data.date) updateData.date = new Date(data.date);
      if (data.description) {
        const cleanDesc = data.description.trim();
        if (cleanDesc.length < 10) throw new Error("Uraian keluhan minimal 10 karakter.");
        updateData.description = cleanDesc;
      }

      // Validasi jika Admin mengubah penugasan PIC
      if (data.picId !== undefined) {
        const cleanPic = data.picId ? data.picId.trim() : "";
        if (cleanPic !== "") {
          const picUser = await tx.user.findUnique({
            where: { id: cleanPic },
            select: { id: true, role: true },
          });
          if (!picUser || (picUser.role !== Role.PIC && picUser.role !== Role.ADMIN)) {
            throw new Error("Petugas yang dipilih tidak valid atau bukan PIC.");
          }
          updateData.picId = picUser.id;
          updateData.assignedAt = new Date();
          if (complaint.status === ComplaintStatus.BELUM_DITANGANI) {
            updateData.status = ComplaintStatus.DALAM_PENANGANAN;
          }
        } else {
          updateData.picId = null;
        }
      }

      const updated = await tx.complaint.update({
        where: { id: complaintId },
        data: updateData,
      });

      // Catat Audit Log
      await tx.auditLog.create({
        data: {
          complaintId,
          userId: user.id,
          action: AuditAction.UPDATE_COMPLAINT,
          entity: "Complaint",
          entityId: complaintId,
          details: {
            updatedFields: Object.keys(updateData),
          },
        },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error editing complaint details:", error);
    return {
      success: false,
      error: error.message || "Gagal memperbarui data keluhan.",
      code: "INTERNAL_ERROR",
    };
  }
}
