// ==============================================================================
// Enums & Types untuk SPKP (Sistem Penanganan Keluhan Pelanggan - KAI)
// Murni TypeScript (Decoupled dari Prisma ORM)
// ==============================================================================

export enum Role {
  ADMIN = "ADMIN",
  PIC = "PIC",
  VERIFIKATOR = "VERIFIKATOR",
}

export enum ComplaintStatus {
  BELUM_DITANGANI = "BELUM_DITANGANI",
  DALAM_PENANGANAN = "DALAM_PENANGANAN",
  MENUNGGU_VERIFIKASI = "MENUNGGU_VERIFIKASI",
  TERVERIFIKASI = "TERVERIFIKASI",
}

export enum VerificationResult {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface VerificationData {
  id: string;
  complaintId?: string;
  verifierId?: string;
  result: VerificationResult;
  feedback: string | null;
  verifiedAt: Date | string;
  verifier: {
    name: string;
    role: Role;
  };
}

export interface ComplaintData {
  id: string;
  complaintNumber: string;
  date: Date | string;
  customerName: string;
  customerContact?: string | null;
  daopOrStation?: string | null;
  source: string;
  description: string;
  status: ComplaintStatus;
  correctiveAction: string | null;
  preventiveAction: string | null;
  proofImageUrl?: string | null;
  notes: string | null;
  picId: string | null;
  pic: UserSummary | null;
  submittedAt?: Date | string | null;
  verifications?: VerificationData[];
  createdAt: Date | string;
  updatedAt?: Date | string;
}
