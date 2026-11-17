import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/DashboardClient";
import { redirect } from "next/navigation";
import { ComplaintData, UserSummary, Role } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  let rawComplaints: ComplaintData[] = [];
  let rawPicList: UserSummary[] = [];
  let dbError: string | null = null;

  try {
    // 1. Ambil data keluhan beserta relasi PIC, Verifikasi, dan Permohonan Reopen via Prisma
    const complaintsData = await prisma.complaint.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        pic: {
          select: { id: true, name: true, email: true, role: true },
        },
        verifications: {
          orderBy: { verifiedAt: "desc" },
          include: {
            verifier: {
              select: { name: true, role: true },
            },
          },
        },
        reopenRequests: {
          orderBy: { requestedAt: "desc" },
          include: {
            requester: {
              select: { id: true, name: true, email: true, role: true },
            },
            reviewer: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });

    rawComplaints = complaintsData as unknown as ComplaintData[];

    // 2. Ambil daftar personil PIC dari tabel User (khusus role PIC, Admin dilarang ditugaskan sebagai PIC)
    const usersData = await prisma.user.findMany({
      where: { role: Role.PIC },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    });

    rawPicList = usersData as unknown as UserSummary[];
  } catch (err: any) {
    console.error("Terjadi kendala koneksi database:", err);
    dbError = err?.message || String(err);
  }

  // Jika tabel belum dibuat di MySQL (belum migrate)
  if (dbError && (dbError.includes("does not exist") || dbError.includes("doesn't exist") || dbError.includes("Unknown table"))) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-xl w-full bg-slate-900 border border-amber-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex items-center gap-3 text-amber-400">
            <span className="text-3xl">⚠️</span>
            <div>
              <h1 className="text-lg font-bold text-white">Tabel Database MySQL Perlu Dibuat</h1>
              <p className="text-xs text-amber-300/80">Skema tabel belum terdeteksi di MySQL.</p>
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-amber-200 break-all">
            {dbError}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Jalankan perintah berikut di terminal untuk membuat tabel:
            <code className="text-blue-400 bg-slate-800 px-1 py-0.5 rounded ml-1">
              npx prisma migrate dev --name init_mysql
            </code>
          </p>
          <div className="flex justify-end">
            <a
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
            >
              🔄 Refresh Halaman
            </a>
          </div>
        </div>
      </div>
    );
  }

  const currentUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  return (
    <DashboardClient
      complaints={rawComplaints}
      picList={rawPicList}
      currentUser={currentUser}
    />
  );
}
