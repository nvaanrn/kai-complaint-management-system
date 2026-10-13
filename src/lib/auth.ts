import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Role } from "@/types/database";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/**
 * Mendapatkan data pengguna yang sedang login berdasarkan sesi NextAuth (JWT).
 *
 * Standar NextAuth v4:
 * - Menggunakan getServerSession() di sisi server (bukan useSession) untuk akses SSR.
 * - Role diambil dari JWT token yang di-set saat authorize() di Credentials Provider.
 * - Jika role tidak valid, return null untuk mencegah akses tanpa role.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return null;
    }

    const role = (session.user as any).role as Role | undefined;

    // Tolak akses jika role tidak terdefinisi atau tidak valid
    const validRoles: Role[] = [Role.ADMIN, Role.PIC, Role.VERIFIKATOR];
    if (!role || !validRoles.includes(role)) {
      console.warn(
        `[Auth] User ${session.user.email} tidak memiliki role yang valid di session JWT.`
      );
      return null;
    }

    const name =
      session.user.name ??
      session.user.email.split("@")[0];

    return {
      id: (session.user as any).id as string,
      name,
      email: session.user.email,
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