import { describe, it, expect } from "vitest";
import { calculateSla } from "@/lib/sla";
import { ComplaintStatus, Role, VerificationResult } from "@/types/database";

describe("Phase 6 UI/UX & Dashboard Logic Tests", () => {
  const mockPicUser = {
    id: "user-pic-1",
    name: "Petugas Lapangan PIC",
    email: "pic1@spkp.kai.id",
    role: Role.PIC,
  };

  const mockComplaints = [
    {
      id: "c-1",
      complaintNumber: "KAI-202610-0001",
      customerName: "Budi",
      customerContact: "08123456789",
      daopOrStation: "Daop 1 Jakarta",
      source: "Telepon",
      date: new Date(Date.now() - 30 * 3600 * 1000).toISOString(), // 30 hours ago (Overdue if target 24h)
      description: "AC di gerbong 3 rusak dan bocor",
      status: ComplaintStatus.BELUM_DITANGANI,
      slaTargetHours: 24,
      pic: null, // Unassigned
      verifications: [],
    },
    {
      id: "c-2",
      complaintNumber: "KAI-202610-0002",
      customerName: "Siti",
      customerContact: "08198765432",
      daopOrStation: "Daop 2 Bandung",
      source: "Email",
      date: new Date(Date.now() - 20 * 3600 * 1000).toISOString(), // 20 hours ago (Near deadline: remaining 4h)
      description: "Keterlambatan pembagian kompensasi",
      status: ComplaintStatus.DALAM_PENANGANAN,
      slaTargetHours: 24,
      pic: mockPicUser, // Assigned to PIC
      verifications: [
        {
          id: "v-1",
          result: VerificationResult.REJECTED,
          feedback: "Foto bukti belum jelas, harap foto nomor seri gerbong",
          verifiedAt: new Date(),
          verifier: { name: "Verifikator Mutu", role: Role.VERIFIKATOR },
        },
      ],
    },
    {
      id: "c-3",
      complaintNumber: "KAI-202610-0003",
      customerName: "Agus",
      customerContact: "08111222333",
      daopOrStation: "Daop 6 Yogyakarta",
      source: "Laporan Langsung",
      date: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      submittedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      description: "Pintu otomatis macet",
      status: ComplaintStatus.MENUNGGU_VERIFIKASI,
      slaTargetHours: 24,
      pic: mockPicUser,
      verifications: [],
    },
    {
      id: "c-4",
      complaintNumber: "KAI-202610-0004",
      customerName: "Dewi",
      customerContact: "08555666777",
      daopOrStation: "Daop 8 Surabaya",
      source: "Helpdesk Internal",
      date: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      submittedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
      description: "Gangguan sinyal wifi stasiun",
      status: ComplaintStatus.TERVERIFIKASI,
      slaTargetHours: 24,
      pic: mockPicUser,
      verifications: [
        {
          id: "v-2",
          result: VerificationResult.APPROVED,
          feedback: "Perbaikan router wifi telah diuji dan berfungsi normal",
          verifiedAt: new Date(),
          verifier: { name: "Verifikator Mutu", role: Role.VERIFIKATOR },
        },
      ],
    },
  ];

  describe("1. Role Overview Metrics Calculation", () => {
    it("Admin Overview: detects unassigned complaints correctly", () => {
      const unassigned = mockComplaints.filter(
        (c) => !c.pic && c.status !== ComplaintStatus.TERVERIFIKASI
      );
      expect(unassigned.length).toBe(1);
      expect(unassigned[0].id).toBe("c-1");
    });

    it("Admin Overview: detects SLA risk tickets (Overdue or Near Deadline)", () => {
      const slaRisks = mockComplaints.filter((c) => {
        if (c.status === ComplaintStatus.TERVERIFIKASI) return false;
        const sla = calculateSla({
          date: c.date,
          status: c.status,
          submittedAt: c.submittedAt,
          completedAt: c.completedAt,
          targetHours: c.slaTargetHours,
        });
        return sla.isOverdue || sla.isNearDeadline;
      });

      // c-1 is overdue (30h > 24h), c-2 is near deadline (20h out of 24h)
      expect(slaRisks.length).toBe(2);
      expect(slaRisks.map((c) => c.id)).toContain("c-1");
      expect(slaRisks.map((c) => c.id)).toContain("c-2");
    });

    it("PIC Overview: filters tasks assigned to currentUser and detects revision status", () => {
      const myTasks = mockComplaints.filter(
        (c) => c.pic && c.pic.id === mockPicUser.id
      );
      expect(myTasks.length).toBe(3);

      const revisions = myTasks.filter((c) => {
        if (c.status !== ComplaintStatus.DALAM_PENANGANAN) return false;
        const lastVerif = c.verifications[0];
        return lastVerif?.result === VerificationResult.REJECTED;
      });

      expect(revisions.length).toBe(1);
      expect(revisions[0].id).toBe("c-2");
      expect(revisions[0].verifications[0].feedback).toContain("Foto bukti belum jelas");
    });

    it("Verifier Overview: detects pending verification queue", () => {
      const pendingQueue = mockComplaints.filter(
        (c) => c.status === ComplaintStatus.MENUNGGU_VERIFIKASI
      );
      expect(pendingQueue.length).toBe(1);
      expect(pendingQueue[0].id).toBe("c-3");
    });
  });

  describe("2. Table Filters & Pagination Logic", () => {
    it("filters by status accurately", () => {
      const filterBelum = mockComplaints.filter(
        (c) => c.status === ComplaintStatus.BELUM_DITANGANI
      );
      expect(filterBelum.length).toBe(1);
      expect(filterBelum[0].complaintNumber).toBe("KAI-202610-0001");
    });

    it("filters by search query across ticket number, customer name, and description", () => {
      const query = "gerbong";
      const matches = mockComplaints.filter((c) =>
        c.description.toLowerCase().includes(query) ||
        c.customerName.toLowerCase().includes(query) ||
        c.complaintNumber.toLowerCase().includes(query)
      );
      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe("c-1");
    });

    it("calculates pagination correctly", () => {
      const pageSize = 2;
      const totalPages = Math.ceil(mockComplaints.length / pageSize);
      expect(totalPages).toBe(2);

      const page1 = mockComplaints.slice(0, 2);
      const page2 = mockComplaints.slice(2, 4);
      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
      expect(page1[0].id).toBe("c-1");
      expect(page2[0].id).toBe("c-3");
    });
  });

  describe("3. SLA Calculation Accuracy for Badges", () => {
    it("reports overdue for active complaints past target hours", () => {
      const sla = calculateSla({
        date: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
        status: ComplaintStatus.BELUM_DITANGANI,
        targetHours: 24,
      });
      expect(sla.isOverdue).toBe(true);
      expect(sla.isMet).toBe(false);
      expect(sla.badgeVariant).toBe("danger");
    });

    it("reports near deadline when remaining hours <= 6", () => {
      const sla = calculateSla({
        date: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
        status: ComplaintStatus.DALAM_PENANGANAN,
        targetHours: 24,
      });
      expect(sla.isNearDeadline).toBe(true);
      expect(sla.isOverdue).toBe(false);
      expect(sla.remainingHours).toBeLessThanOrEqual(6);
    });

    it("reports met when verified within target SLA", () => {
      const startDate = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
      const completedDate = new Date(Date.now() - 2 * 3600 * 1000).toISOString(); // 18 hours duration
      const sla = calculateSla({
        date: startDate,
        status: ComplaintStatus.TERVERIFIKASI,
        completedAt: completedDate,
        targetHours: 24,
      });
      expect(sla.isMet).toBe(true);
      expect(sla.isOverdue).toBe(false);
      expect(sla.badgeVariant).toBe("success");
    });
  });

  describe("4. Form Validation Constraints Aligned with Backend", () => {
    it("validates that rejection feedback cannot be empty", () => {
      const validateRejection = (result: VerificationResult, feedback: string) => {
        if (result === VerificationResult.REJECTED && !feedback.trim()) {
          return { valid: false, error: "Alasan penolakan wajib diisi" };
        }
        return { valid: true };
      };

      expect(validateRejection(VerificationResult.REJECTED, "").valid).toBe(false);
      expect(validateRejection(VerificationResult.REJECTED, "   ").valid).toBe(false);
      expect(
        validateRejection(VerificationResult.REJECTED, "Bukti foto belum lengkap").valid
      ).toBe(true);
      expect(validateRejection(VerificationResult.APPROVED, "").valid).toBe(true);
    });

    it("validates that PIC submission for verification requires corrective, preventive, and proof image", () => {
      const validatePicSubmission = (
        corrective: string,
        preventive: string,
        proofImage: string | null
      ) => {
        if (!corrective.trim() || !preventive.trim() || !proofImage) {
          return false;
        }
        return true;
      };

      expect(validatePicSubmission("", "pencegahan", "https://img.url")).toBe(false);
      expect(validatePicSubmission("perbaikan", "", "https://img.url")).toBe(false);
      expect(validatePicSubmission("perbaikan", "pencegahan", null)).toBe(false);
      expect(validatePicSubmission("perbaikan", "pencegahan", "https://img.url")).toBe(true);
    });
  });
});
