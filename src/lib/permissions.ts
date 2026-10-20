import { Role, ComplaintStatus } from "@/types/database";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface ComplaintSummary {
  id: string;
  picId: string | null;
  status: ComplaintStatus | string;
  complaintNumber?: string | null;
  documentId?: string | null;
}

/**
 * Matriks Hak Akses & Kewenangan SPKP KAI (RBAC)
 * Berdasarkan Prinsip Separation of Duties dan Four-Eyes Principle (SOP KAI)
 */
export const Permissions = {
  // Hanya Admin yang berwenang menugaskan atau mengganti PIC
  canAssignPIC: (user: UserSession | null): boolean => {
    return user !== null && user.role === Role.ADMIN;
  },

  // Hanya Admin yang berwenang mengedit data registrasi pokok keluhan
  canEditComplaint: (user: UserSession | null, complaint?: ComplaintSummary): boolean => {
    if (!user || user.role !== Role.ADMIN) return false;
    // Keluhan yang sudah TERVERIFIKASI tidak boleh diubah data pokoknya secara sembarangan
    if (complaint && complaint.status === ComplaintStatus.TERVERIFIKASI) {
      return false;
    }
    return true;
  },

  // Hanya Admin yang berwenang menghapus keluhan
  canDeleteComplaint: (user: UserSession | null): boolean => {
    return user !== null && user.role === Role.ADMIN;
  },

  // PIC hanya berwenang mengeksekusi keluhan yang ditugaskan kepadanya.
  // Admin TIDAK memiliki override untuk tindakan penanganan (separation of duties).
  canExecuteComplaint: (user: UserSession | null, complaint: ComplaintSummary): boolean => {
    if (!user) return false;
    // Status keluhan harus DALAM_PENANGANAN atau BELUM_DITANGANI untuk dapat dikerjakan
    if (
      complaint.status === ComplaintStatus.MENUNGGU_VERIFIKASI ||
      complaint.status === ComplaintStatus.TERVERIFIKASI
    ) {
      return false;
    }
    // Hanya PIC yang ditugaskan — Admin TIDAK memiliki hak eksekusi penanganan
    if (user.role === Role.PIC) {
      return complaint.picId === user.id;
    }
    return false;
  },

  // Hanya PIC yang ditugaskan yang berwenang mengajukan hasil untuk verifikasi
  canSubmitForVerification: (user: UserSession | null, complaint: ComplaintSummary): boolean => {
    if (!user) return false;
    if (complaint.status !== ComplaintStatus.DALAM_PENANGANAN) return false;
    if (user.role === Role.PIC) {
      return complaint.picId === user.id;
    }
    return false;
  },

  // Hanya Verifikator yang berwenang memvalidasi hasil eksekusi PIC
  // (Admin DILARANG KERAS memverifikasi — SOP KAI four-eyes principle)
  canVerifyComplaint: (user: UserSession | null, complaint?: ComplaintSummary): boolean => {
    if (!user) return false;
    if (user.role !== Role.VERIFIKATOR) return false;
    // Verifikasi hanya sah jika keluhan sedang dalam status MENUNGGU_VERIFIKASI
    if (complaint && complaint.status !== ComplaintStatus.MENUNGGU_VERIFIKASI) {
      return false;
    }
    return true;
  },

  // Pengajuan buka kembali (Reopen Request): Diizinkan untuk Verifikator dan Admin
  canRequestReopen: (user: UserSession | null, complaint: ComplaintSummary): boolean => {
    if (!user) return false;
    // Hanya keluhan yang sudah selesai (TERVERIFIKASI) yang dapat diajukan reopen
    if (complaint.status !== ComplaintStatus.TERVERIFIKASI) return false;
    return user.role === Role.VERIFIKATOR || user.role === Role.ADMIN;
  },

  // Keputusan buka kembali (Approve / Reject Reopen): Mutlak hanya oleh ADMIN
  canReviewReopen: (user: UserSession | null): boolean => {
    return user !== null && user.role === Role.ADMIN;
  },

  // Penerbitan dokumen rekapitulasi audit FR.SM/TI/033.001: Hanya oleh ADMIN
  canGenerateDocument: (user: UserSession | null): boolean => {
    return user !== null && user.role === Role.ADMIN;
  },
};
