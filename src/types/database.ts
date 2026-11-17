// ==============================================================================
// Enums & Types untuk SPKP (Sistem Penanganan Keluhan Pelanggan - KAI)
// Murni TypeScript (Decoupled dari Prisma ORM untuk Client & Server UI)
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

export enum ComplaintCategory {
  KESELAMATAN_KEAMANAN = "KESELAMATAN_KEAMANAN",
  FASILITAS_KERETA = "FASILITAS_KERETA",
  FASILITAS_STASIUN = "FASILITAS_STASIUN",
  TIKET_DAN_SISTEM = "TIKET_DAN_SISTEM",
  PELAYANAN_PETUGAS = "PELAYANAN_PETUGAS",
  REFUND_DAN_TARIF = "REFUND_DAN_TARIF",
  INFORMASI_DAN_LAINNYA = "INFORMASI_DAN_LAINNYA",
}

export enum ReopenStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum DocumentStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
  SUPERSEDED = "SUPERSEDED",
}

export enum AuditAction {
  CREATE_COMPLAINT = "CREATE_COMPLAINT",
  UPDATE_COMPLAINT = "UPDATE_COMPLAINT",
  ASSIGN_PIC = "ASSIGN_PIC",
  SAVE_PROGRESS = "SAVE_PROGRESS",
  SUBMIT_VERIFICATION = "SUBMIT_VERIFICATION",
  VERIFY_APPROVED = "VERIFY_APPROVED",
  VERIFY_REJECTED = "VERIFY_REJECTED",
  REQUEST_REOPEN = "REQUEST_REOPEN",
  APPROVE_REOPEN = "APPROVE_REOPEN",
  REJECT_REOPEN = "REJECT_REOPEN",
  GENERATE_DOCUMENT = "GENERATE_DOCUMENT",
  REVISE_DOCUMENT = "REVISE_DOCUMENT",
  DELETE_COMPLAINT = "DELETE_COMPLAINT",
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
  cycle?: number;
  verifiedAt: Date | string;
  verifier: {
    name: string;
    role: Role;
  };
}

export interface ReopenRequestData {
  id: string;
  complaintId: string;
  requestedById: string;
  reason: string;
  status: ReopenStatus;
  reviewedById?: string | null;
  adminNotes?: string | null;
  requestedAt: Date | string;
  reviewedAt?: Date | string | null;
  requester?: UserSummary;
  reviewer?: UserSummary | null;
}

export interface ComplaintData {
  id: string;
  complaintNumber: string;
  date: Date | string;
  customerName: string;
  customerContact?: string | null;
  daopOrStation?: string | null;
  source: string;
  category?: ComplaintCategory | null;
  description: string;
  status: ComplaintStatus;
  correctiveAction: string | null;
  preventiveAction: string | null;
  proofImageUrl?: string | null;
  notes: string | null;
  picId: string | null;
  pic: UserSummary | null;
  assignedAt?: Date | string | null;
  submittedAt?: Date | string | null;
  completedAt?: Date | string | null;
  submissionCount?: number;
  verifications?: VerificationData[];
  reopenRequests?: ReopenRequestData[];
  documentId?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface ComplaintSnapshotItem {
  complaintId: string;
  complaintNumber: string;
  date: Date | string;
  customerName: string;
  customerContact?: string | null;
  daopOrStation?: string | null;
  source: string;
  category?: ComplaintCategory | string | null;
  description: string;
  picName: string;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
  proofImageUrl?: string | null;
  notes?: string | null;
  status: string;
  verifiedAt?: Date | string | null;
  verifierName?: string | null;
  verificationFeedback?: string | null;
  cycle?: number;
}

export interface DocumentData {
  id: string;
  documentNumber: string;
  version: string;
  revisionNumber: number;
  parentDocumentId?: string | null;
  revisionReason?: string | null;
  status: DocumentStatus;
  documentDate: Date | string;
  publishedAt?: Date | string | null;
  createdById: string;
  createdBy?: UserSummary;
  managementRep: string;
  snapshotData?: ComplaintSnapshotItem[] | any;
  totalComplaints: number;
  createdAt: Date | string;
  updatedAt?: Date | string;
}
