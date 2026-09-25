import { Role } from "@/types/database";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface ComplaintSummary {
  id: string;
  picId: string | null;
  status: string;
}

/**
 * Matriks Hak Akses & Kewenangan SPKP KAI (RBAC)
 */
export const Permissions = {
  // Hanya Admin yang berwenang menugaskan PIC
  canAssignPIC: (user: UserSession | null): boolean => {
    return user !== null && user.role === Role.ADMIN;
  },

  // Hanya Admin yang berwenang mengedit data registrasi keluhan
  canEditComplaint: (user: UserSession | null): boolean => {
    return user !== null && user.role === Role.ADMIN;
  },

  // Hanya Admin yang berwenang menghapus keluhan
  canDeleteComplaint: (user: UserSession | null): boolean => {
    return user !== null && user.role === Role.ADMIN;
  },

  // PIC hanya berwenang mengeksekusi keluhan yang ditugaskan kepadanya
  canExecuteComplaint: (user: UserSession | null, complaint: ComplaintSummary): boolean => {
    if (!user) return false;
    if (user.role === Role.ADMIN) return true; // Admin memiliki override superuser
    if (user.role === Role.PIC) {
      return complaint.picId === user.id;
    }
    return false;
  },

  // Hanya Verifikator (atau Admin) yang berwenang memvalidasi hasil eksekusi PIC
  canVerifyComplaint: (user: UserSession | null): boolean => {
    if (!user) return false;
    return user.role === Role.VERIFIKATOR || user.role === Role.ADMIN;
  },
};
