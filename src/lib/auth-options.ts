import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@/types/database";
import { isValidNipp, MAX_FAILED_ATTEMPTS, LOCK_DURATION_MINUTES } from "@/config/auth";

// Hash tiruan: perbandingan tetap dijalankan saat NIPP tidak ditemukan agar waktu respons seragam.
const DUMMY_HASH = bcrypt.hashSync("spkp-dummy-password", 10);

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        nipp: { label: "NIPP", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const nipp = credentials?.nipp?.trim();
        const password = credentials?.password?.trim();

        if (!nipp || !password || !isValidNipp(nipp)) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { nipp } });

        if (!user) {
          await bcrypt.compare(password, DUMMY_HASH);
          return null;
        }

        // Akun nonaktif atau sedang terkunci: ditolak dengan hasil yang sama seperti password salah.
        if (!user.isActive) {
          return null;
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          const attempts = user.failedAttempts + 1;
          const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedAttempts: shouldLock ? 0 : attempts,
              lockedUntil: shouldLock
                ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
                : null,
            },
          });
          return null;
        }

        if (user.failedAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedAttempts: 0, lockedUntil: null },
          });
        }

        return {
          id: user.id,
          name: user.name,
          nipp: user.nipp,
          role: user.role as Role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.nipp = (user as any).nipp as string;
        token.role = (user as any).role as Role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).nipp = token.nipp as string;
        (session.user as any).role = token.role as Role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 jam (standar shift operasional KAI)
  },
  secret: process.env.NEXTAUTH_SECRET,
};
