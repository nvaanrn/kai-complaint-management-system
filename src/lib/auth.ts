import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types/database";

export interface AuthenticatedUser {
  id: string;
  name: string;
  nipp: string;
  role: Role;
}

/**
 * Mendapatkan data pengguna yang sedang login berdasarkan sesi NextAuth (JWT).
 *
 * Setiap pemanggilan memeriksa tabel User: akun yang dinonaktifkan langsung kehilangan akses
 * walau token JWT-nya belum kedaluwarsa, dan role selalu diambil dari database (bukan dari token).
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return null;
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, nipp: true, role: true, isActive: true },
    });

    if (!dbUser || !dbUser.isActive) {
      return null;
    }

    // Tolak akses jika role tidak valid
    const role = dbUser.role as Role;
    const validRoles: Role[] = [Role.ADMIN, Role.PIC, Role.VERIFIKATOR];
    if (!validRoles.includes(role)) {
      console.warn(`[Auth] User NIPP ${dbUser.nipp} tidak memiliki role yang valid.`);
      return null;
    }

    return {
      id: dbUser.id,
      name: dbUser.name,
      nipp: dbUser.nipp,
      role,
    };
  } catch (error: any) {
    console.error("Gagal mendapatkan current user dari NextAuth session:", error);
    return null;
  }
}

/**
 * Helper untuk memvalidasi otentikasi dan otorisasi role pengguna di Server Actions / Components.
 */
export async function requireUser(allowedRoles?: Role[]): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized. Silakan login terlebih dahulu.");
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw new Error("Forbidden. Anda tidak memiliki akses untuk tindakan ini.");
  }

  return user;
}
