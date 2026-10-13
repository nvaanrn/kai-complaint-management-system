import { ComplaintStatus, Role, AuditAction } from "@/types/database";

export interface TransitionResult {
  isAllowed: boolean;
  nextStatus?: ComplaintStatus;
  error?: string;
}

/**
 * Validator Transisi State Machine Siklus Hidup Keluhan SPKP KAI
 * Memastikan tidak ada loncatan status ilegal atau intervensi tanpa hak akses.
 */
export function validateStateTransition(
  currentStatus: ComplaintStatus,
  action: AuditAction,
  userRole: Role
): TransitionResult {
  switch (currentStatus) {
    case ComplaintStatus.BELUM_DITANGANI:
      if (action === AuditAction.ASSIGN_PIC) {
        if (userRole !== Role.ADMIN) {
          return {
            isAllowed: false,
            error: "Hanya Admin yang berwenang menugaskan PIC untuk keluhan belum ditangani.",
          };
        }
        return { isAllowed: true, nextStatus: ComplaintStatus.DALAM_PENANGANAN };
      }
      return {
        isAllowed: false,
        error: `Aksi ${action} tidak sah untuk keluhan berstatus BELUM_DITANGANI. Keluhan harus ditugaskan ke PIC terlebih dahulu.`,
      };

    case ComplaintStatus.DALAM_PENANGANAN:
      if (action === AuditAction.SAVE_PROGRESS) {
        if (userRole !== Role.PIC && userRole !== Role.ADMIN) {
          return {
            isAllowed: false,
            error: "Hanya petugas PIC yang berwenang menyimpan progres penanganan.",
          };
        }
        return { isAllowed: true, nextStatus: ComplaintStatus.DALAM_PENANGANAN };
      }

      if (action === AuditAction.ASSIGN_PIC) {
        if (userRole !== Role.ADMIN) {
          return {
            isAllowed: false,
            error: "Hanya Admin yang berwenang mengganti penugasan PIC.",
          };
        }
        return { isAllowed: true, nextStatus: ComplaintStatus.DALAM_PENANGANAN };
      }

      if (action === AuditAction.SUBMIT_VERIFICATION) {
        if (userRole !== Role.PIC) {
          return {
            isAllowed: false,
            error: "Hanya PIC yang berwenang mengajukan hasil penanganan untuk verifikasi.",
          };
        }
        return { isAllowed: true, nextStatus: ComplaintStatus.MENUNGGU_VERIFIKASI };
      }

      return {
        isAllowed: false,
        error: `Aksi ${action} tidak dapat dilakukan pada keluhan yang sedang DALAM_PENANGANAN.`,
      };

    case ComplaintStatus.MENUNGGU_VERIFIKASI:
      if (action === AuditAction.VERIFY_APPROVED) {
        if (userRole !== Role.VERIFIKATOR) {
          return {
            isAllowed: false,
            error: "Hanya Verifikator yang berwenang menyetujui hasil penanganan (SOP KAI four-eyes principle).",
          };
        }
        return { isAllowed: true, nextStatus: ComplaintStatus.TERVERIFIKASI };
      }

      if (action === AuditAction.VERIFY_REJECTED) {
        if (userRole !== Role.VERIFIKATOR) {
          return {
            isAllowed: false,
            error: "Hanya Verifikator yang berwenang menolak hasil verifikasi penanganan.",
          };
        }
        // Penolakan mengembalikan keluhan ke PIC awal di status DALAM_PENANGANAN
        return { isAllowed: true, nextStatus: ComplaintStatus.DALAM_PENANGANAN };
      }

      return {
        isAllowed: false,
        error: `Aksi ${action} tidak sah. Keluhan sedang MENUNGGU_VERIFIKASI dan menunggu keputusan Verifikator.`,
      };

    case ComplaintStatus.TERVERIFIKASI:
      if (action === AuditAction.REQUEST_REOPEN) {
        if (userRole !== Role.VERIFIKATOR && userRole !== Role.ADMIN) {
          return {
            isAllowed: false,
            error: "Hanya Verifikator atau Admin yang dapat mengajukan permohonan pembukaan kembali keluhan.",
          };
        }
        // Status keluhan pokok tetap TERVERIFIKASI hingga disetujui Admin
        return { isAllowed: true, nextStatus: ComplaintStatus.TERVERIFIKASI };
      }

      if (action === AuditAction.APPROVE_REOPEN) {
        if (userRole !== Role.ADMIN) {
          return {
            isAllowed: false,
            error: "Hanya Admin yang berwenang menyetujui pembukaan kembali keluhan.",
          };
        }
        // Pembukaan kembali mengembalikan tiket ke DALAM_PENANGANAN
        return { isAllowed: true, nextStatus: ComplaintStatus.DALAM_PENANGANAN };
      }

      if (action === AuditAction.REJECT_REOPEN) {
        if (userRole !== Role.ADMIN) {
          return {
            isAllowed: false,
            error: "Hanya Admin yang berwenang menolak pembukaan kembali keluhan.",
          };
        }
        return { isAllowed: true, nextStatus: ComplaintStatus.TERVERIFIKASI };
      }

      return {
        isAllowed: false,
        error: `Keluhan telah TERVERIFIKASI dan selesai. Aksi ${action} ditolak kecuali melalui alur pembukaan kembali (Reopen).`,
      };

    default:
      return {
        isAllowed: false,
        error: "Status keluhan tidak dikenali dalam sistem.",
      };
  }
}
