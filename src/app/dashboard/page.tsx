import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardClient, { ComplaintData, UserSummary } from "@/components/DashboardClient";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // 1. Ambil seluruh data keluhan terurut dari yang terbaru
  const rawComplaints = await prisma.complaint.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      pic: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      verifications: {
        orderBy: { verifiedAt: "desc" },
        include: {
          verifier: {
            select: {
              name: true,
              role: true,
            },
          },
        },
      },
    },
  });

  // 2. Ambil daftar user yang memiliki wewenang penanganan PIC / ADMIN
  const rawPicList = await prisma.user.findMany({
    where: {
      role: {
        in: [Role.PIC, Role.ADMIN],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });

  const complaints: ComplaintData[] = rawComplaints as unknown as ComplaintData[];
  const picList: UserSummary[] = rawPicList as unknown as UserSummary[];

  const currentUser = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };

  return (
    <DashboardClient
      complaints={complaints}
      picList={picList}
      currentUser={currentUser}
    />
  );
}
