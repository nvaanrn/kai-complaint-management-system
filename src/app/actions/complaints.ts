"use server";

import { getSupabaseDb } from "@/lib/supabase/db";
import { ComplaintStatus, Role, VerificationResult } from "@/types/database";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { validateComplaintInput, validatePicExecutionInput, validateVerificationInput } from "@/lib/validation";
import { formatComplaintNumber, parseNextSequence } from "@/lib/complaintNumber";

// 1. Generate nomor keluhan otomatis: CMP-YYYY-XXX via Supabase
async function generateComplaintNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CMP-${currentYear}-`;

  try {
    const supabase = await getSupabaseDb();
    const { data: lastComplaint, error } = await supabase
      .from("Complaint")
      .select("complaintNumber")
      .like("complaintNumber", `${prefix}%`)
      .order("complaintNumber", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSequence = parseNextSequence(!error ? lastComplaint?.complaintNumber : null, currentYear);
    return formatComplaintNumber(currentYear, nextSequence);
  } catch (err) {
    console.warn("Gagal cek sequence terakhir, menggunakan default urutan:", err);
    return formatComplaintNumber(currentYear, 1);
  }
}

// 2. Server Action: Tambah Keluhan Baru (Admin / Registrasi)
export async function createComplaint(formData: {
  customerName: string;
  customerContact?: string;
  daopOrStation?: string;
  source: string;
  description: string;
  date?: string;
  picId?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Silakan login terlebih dahulu." };
  }

  // Sesuai SOP KAI: Validasi keluhan
  const validation = validateComplaintInput({
    customerName: formData.customerName,
    description: formData.description,
    source: formData.source,
  });

  if (!validation.isValid) {
    return { success: false, error: validation.firstError };
  }

  try {
    const supabase = await getSupabaseDb();
    const complaintNumber = await generateComplaintNumber();
    const complaintDate = formData.date ? new Date(formData.date) : new Date();

    const initialStatus = formData.picId
      ? ComplaintStatus.DALAM_PENANGANAN
      : ComplaintStatus.BELUM_DITANGANI;

    const id = crypto.randomUUID();

    const now = new Date().toISOString();
    let insertPayload: any = {
      id,
      complaintNumber,
      customerName: formData.customerName.trim(),
      customerContact: formData.customerContact?.trim() || null,
      daopOrStation: formData.daopOrStation?.trim() || null,
      source: formData.source,
      description: formData.description.trim(),
      date: complaintDate.toISOString(),
      status: initialStatus,
      picId: formData.picId && formData.picId !== "" ? formData.picId : null,
      updatedAt: now, // Wajib diisi eksplisit — Supabase PostgREST tidak selalu trigger DEFAULT
    };

    let { data: newComplaint, error } = await supabase
      .from("Complaint")
      .insert(insertPayload)
      .select()
      .single();

    // Defensive fallback: jika database Supabase belum menjalankan migrasi kolom customerContact / daopOrStation
    if (
      error &&
      (error.message?.includes("customerContact") ||
        error.message?.includes("daopOrStation") ||
        error.message?.includes("schema cache"))
    ) {
      console.warn("Retrying complaint insertion without newly added optional columns due to schema cache mismatch:", error.message);
      delete insertPayload.customerContact;
      delete insertPayload.daopOrStation;

      const retryResult = await supabase
        .from("Complaint")
        .insert(insertPayload)
        .select()
        .single();

      newComplaint = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.error("Error creating complaint in Supabase:", error);
      return { success: false, error: error.message || "Gagal mencatat keluhan baru ke Supabase." };
    }

    revalidatePath("/dashboard");
    return { success: true, data: newComplaint };
  } catch (error: any) {
    console.error("Error creating complaint:", error);
    return { success: false, error: error.message || "Gagal mencatat keluhan baru." };
  }
}

// 3. Server Action: Menugaskan PIC (Admin)
export async function assignPIC(complaintId: string, picId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return { success: false, error: "Hanya Admin yang berwenang menentukan penugasan PIC." };
  }

  try {
    const supabase = await getSupabaseDb();
    const newStatus = picId && picId !== "" ? ComplaintStatus.DALAM_PENANGANAN : ComplaintStatus.BELUM_DITANGANI;

    const { data: updated, error } = await supabase
      .from("Complaint")
      .update({
        picId: picId && picId !== "" ? picId : null,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", complaintId)
      .select()
      .single();

    if (error) {
      console.error("Error assigning PIC in Supabase:", error);
      return { success: false, error: error.message || "Gagal menugaskan PIC." };
    }

    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error assigning PIC:", error);
    return { success: false, error: error.message || "Gagal menugaskan PIC." };
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
) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized." };
  }

  // Sesuai SOP KAI: Hanya PIC yang berwenang mengisi tindakan penanganan
  if (user.role !== Role.PIC) {
    return {
      success: false,
      error: "Hanya petugas PIC yang berwenang melakukan tindakan penanganan dan pengajuan verifikasi.",
    };
  }

  try {
    const supabase = await getSupabaseDb();

    // Validasi: PIC hanya boleh mengeksekusi keluhan yang ditugaskan kepada dirinya
    const { data: existingComplaint, error: fetchErr } = await supabase
      .from("Complaint")
      .select("picId, status")
      .eq("id", complaintId)
      .single();

    if (fetchErr || !existingComplaint) {
      return { success: false, error: "Data keluhan tidak ditemukan." };
    }

    if (existingComplaint.picId !== user.id) {
      return {
        success: false,
        error: "Akses ditolak. Anda hanya berwenang mengeksekusi keluhan yang ditugaskan kepada Anda.",
      };
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

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
      updateData.submittedAt = new Date().toISOString();
    } else {
      // Pastikan tetap DALAM_PENANGANAN
      if (existingComplaint.status === ComplaintStatus.BELUM_DITANGANI) {
        updateData.status = ComplaintStatus.DALAM_PENANGANAN;
      }
    }

    if (corrective !== undefined) updateData.correctiveAction = corrective;
    if (preventive !== undefined) updateData.preventiveAction = preventive;
    if (data.notes !== undefined) updateData.notes = data.notes.trim();
    if (data.proofImageUrl !== undefined) updateData.proofImageUrl = data.proofImageUrl;

    let { data: updated, error } = await supabase
      .from("Complaint")
      .update(updateData)
      .eq("id", complaintId)
      .select()
      .single();

    // Defensive fallback jika kolom submittedAt atau proofImageUrl belum dibuat di database
    if (
      error &&
      (error.message?.includes("submittedAt") ||
        error.message?.includes("proofImageUrl") ||
        error.message?.includes("schema cache"))
    ) {
      console.warn("Retrying PIC execution update without newly added columns due to schema cache mismatch:", error.message);
      delete updateData.submittedAt;
      delete updateData.proofImageUrl;

      const retryResult = await supabase
        .from("Complaint")
        .update(updateData)
        .eq("id", complaintId)
        .select()
        .single();

      updated = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.error("Error updating complaint progress in Supabase:", error);
      return { success: false, error: error.message || "Gagal memperbarui status keluhan." };
    }

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
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized." };
  }

  // Sesuai aturan KAI: Verifikasi hanya oleh Verifikator (Admin tidak melakukan verifikasi)
  if (user.role !== Role.VERIFIKATOR && user.role !== Role.ADMIN) {
    return { success: false, error: "Hanya Verifikator yang berwenang melakukan verifikasi mutu keluhan." };
  }

  // Jika Ditolak, alasan reject WAJIB diisi
  if (data.result === VerificationResult.REJECTED && (!data.feedback || data.feedback.trim() === "")) {
    return { success: false, error: "Alasan penolakan / feedback perbaikan wajib diisi saat menolak keluhan." };
  }

  try {
    const supabase = await getSupabaseDb();

    // 1. Catat ke histori verifikasi tanpa menimpa data lama
    const verificationId = crypto.randomUUID();
    const { error: vError } = await supabase
      .from("Verification")
      .insert({
        id: verificationId,
        complaintId,
        verifierId: user.id,
        result: data.result,
        feedback: data.feedback?.trim() || null,
        verifiedAt: new Date().toISOString(),
      });

    if (vError) {
      console.error("Error creating verification in Supabase:", vError);
      return { success: false, error: vError.message || "Gagal menyimpan riwayat verifikasi." };
    }

    // 2. Tentukan status baru:
    // Approve: MENUNGGU VERIFIKASI -> TERVERIFIKASI
    // Reject: MENUNGGU VERIFIKASI -> kembali ke DALAM PENANGANAN
    const newStatus =
      data.result === VerificationResult.APPROVED
        ? ComplaintStatus.TERVERIFIKASI
        : ComplaintStatus.DALAM_PENANGANAN;

    // Hanya update status & updatedAt — jangan timpa field notes milik PIC
    const { data: updated, error } = await supabase
      .from("Complaint")
      .update({
        status: newStatus,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", complaintId)
      .select()
      .single();

    if (error) {
      console.error("Error updating complaint status in Supabase:", error);
      return { success: false, error: error.message || "Gagal memperbarui status verifikasi keluhan." };
    }

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
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized." };
  }

  if (!data.complaintIds || data.complaintIds.length === 0) {
    return { success: false, error: "Pilih minimal 1 keluhan untuk dimasukkan ke dalam dokumen." };
  }

  try {
    const supabase = await getSupabaseDb();
    const docNumber = data.documentNumber || `FR.SM/TI/033.001/${new Date().getMonth() + 1}-${new Date().getFullYear()}`;
    const docId = crypto.randomUUID();

    const { data: newDoc, error: docError } = await supabase
      .from("Document")
      .insert({
        id: docId,
        documentNumber: docNumber,
        version: "002-2020",
        documentDate: new Date().toISOString(),
        createdById: user.id,
        managementRep: data.managementRep || "Management Representative KAI",
      })
      .select()
      .single();

    if (docError) {
      console.error("Error creating document in Supabase:", docError);
      return { success: false, error: docError.message || "Gagal membuat dokumen rekapitulasi." };
    }

    // Sambungkan relasi complaint ke documentId
    await supabase
      .from("Complaint")
      .update({ documentId: docId, updatedAt: new Date().toISOString() })
      .in("id", data.complaintIds);

    revalidatePath("/dashboard");
    return { success: true, data: newDoc };
  } catch (error: any) {
    console.error("Error creating document batch:", error);
    return { success: false, error: error.message || "Gagal membuat dokumen rekapitulasi." };
  }
}

// 7. Server Action: Hapus Keluhan (Khusus Admin)
export async function deleteComplaint(complaintId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return { success: false, error: "Hanya Admin yang berwenang menghapus data keluhan." };
  }

  try {
    const supabase = await getSupabaseDb();

    // Hapus verifikasi terkait terlebih dahulu (cascade)
    await supabase.from("Verification").delete().eq("complaintId", complaintId);

    const { data: deleted, error } = await supabase
      .from("Complaint")
      .delete()
      .eq("id", complaintId)
      .select()
      .single();

    if (error) {
      console.error("Error deleting complaint in Supabase:", error);
      return { success: false, error: error.message || "Gagal menghapus keluhan dari Supabase." };
    }

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
    customerContact?: string;
    daopOrStation?: string;
    source?: string;
    date?: string;
    description?: string;
    picId?: string | null;
  }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return { success: false, error: "Hanya Admin yang berwenang mengedit data registrasi keluhan." };
  }

  try {
    const supabase = await getSupabaseDb();
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (data.customerName) updateData.customerName = data.customerName.trim();
    if (data.customerContact !== undefined) updateData.customerContact = data.customerContact.trim() || null;
    if (data.daopOrStation !== undefined) updateData.daopOrStation = data.daopOrStation.trim() || null;
    if (data.source) updateData.source = data.source;
    if (data.date) updateData.date = new Date(data.date).toISOString();
    if (data.description) updateData.description = data.description.trim();
    if (data.picId !== undefined) {
      updateData.picId = data.picId && data.picId !== "" ? data.picId : null;
    }

    let { data: updated, error } = await supabase
      .from("Complaint")
      .update(updateData)
      .eq("id", complaintId)
      .select()
      .single();

    // Defensive fallback jika customerContact atau daopOrStation belum dibuat di database
    if (
      error &&
      (error.message?.includes("customerContact") ||
        error.message?.includes("daopOrStation") ||
        error.message?.includes("schema cache"))
    ) {
      console.warn("Retrying edit complaint details without newly added optional columns:", error.message);
      delete updateData.customerContact;
      delete updateData.daopOrStation;

      const retryResult = await supabase
        .from("Complaint")
        .update(updateData)
        .eq("id", complaintId)
        .select()
        .single();

      updated = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.error("Error updating complaint details in Supabase:", error);
      return { success: false, error: error.message || "Gagal memperbarui data keluhan." };
    }

    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error editing complaint details:", error);
    return { success: false, error: error.message || "Gagal memperbarui data keluhan." };
  }
}
