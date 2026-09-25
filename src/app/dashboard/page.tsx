import { getCurrentUser } from "@/lib/auth";
import { getSupabaseDb } from "@/lib/supabase/db";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
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
    const supabase = await getSupabaseDb();

    // 1. Ambil data keluhan beserta relasi PIC dan Verifikasi via Supabase Client
    const { data: complaintsData, error: cError } = await supabase
      .from("Complaint")
      .select(`
        *,
        pic:picId ( id, name, email, role ),
        verifications:Verification (
          id,
          result,
          feedback,
          verifiedAt,
          verifier:verifierId ( name, role )
        )
      `)
      .order("createdAt", { ascending: false });

    if (cError) {
      console.warn("⚠️ Query Complaint via Supabase Client:", cError.message);
      dbError = cError.message;
    } else if (complaintsData) {
      rawComplaints = complaintsData as unknown as ComplaintData[];
    }

    // 2. Ambil daftar personil PIC dari tabel User Supabase
    const { data: usersData, error: uError } = await supabase
      .from("User")
      .select("id, name, email, role")
      .in("role", [Role.PIC, Role.ADMIN])
      .order("name", { ascending: true });

    if (!uError && usersData && usersData.length > 0) {
      rawPicList = usersData as unknown as UserSummary[];
    }
  } catch (err: any) {
    console.error("Terjadi kendala koneksi Supabase:", err);
    dbError = err?.message || String(err);
  }

  // 3. Fallback: Ambil personil PIC langsung dari Supabase Auth jika tabel User belum diisi
  if (rawPicList.length === 0 && process.env.NEXT_SERVICE_ROLE_KEY) {
    try {
      const adminSupabase = createAdminSupabaseClient();
      const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
      if (authUsers?.users && authUsers.users.length > 0) {
        rawPicList = authUsers.users
          .filter(
            (u) =>
              u.app_metadata?.role === Role.PIC ||
              u.app_metadata?.role === Role.ADMIN ||
              u.user_metadata?.role === Role.PIC ||
              u.user_metadata?.role === Role.ADMIN
          )
          .map((u) => ({
            id: u.id,
            name:
              (u.user_metadata?.name as string) ||
              (u.app_metadata?.name as string) ||
              u.email?.split("@")[0] ||
              "Staf KAI",
            email: u.email || "",
            role:
              (u.app_metadata?.role as Role) ||
              (u.user_metadata?.role as Role) ||
              Role.PIC,
          }));
      }
    } catch (e) {
      console.warn("Gagal mengambil PIC dari Supabase Auth:", e);
    }
  }

  // 4. Default fallback personil resmi KAI jika belum ada data user sama sekali
  if (rawPicList.length === 0) {
    rawPicList = [
      {
        id: "pic-kai-default",
        name: "Budi Santoso (PIC Operasional)",
        email: "pic@spkp.kai.id",
        role: Role.PIC,
      },
      {
        id: "admin-kai-default",
        name: "Administrator SPKP",
        email: "admin@spkp.kai.id",
        role: Role.ADMIN,
      },
    ];
  }

  // Jika tabel belum dibuat di Supabase (misal error relation does not exist)
  if (dbError && dbError.includes("does not exist")) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-xl w-full bg-slate-900 border border-amber-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex items-center gap-3 text-amber-400">
            <span className="text-3xl">⚠️</span>
            <div>
              <h1 className="text-lg font-bold text-white">Tabel Database Supabase Perlu Dibuat</h1>
              <p className="text-xs text-amber-300/80">Skema tabel public di Supabase belum terdeteksi.</p>
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-amber-200 break-all">
            {dbError}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Silakan buka <strong>Supabase Dashboard ➜ SQL Editor</strong>, lalu jalankan isi berkas migrasi:
            <code className="text-blue-400 bg-slate-800 px-1 py-0.5 rounded ml-1">
              supabase/migrations/20260925132048_initial_schema.sql
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
