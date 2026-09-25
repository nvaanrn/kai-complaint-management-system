import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    providers: [
        CredentialsProvider({
            name: "KAI Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "nama@kai.id" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email dan password wajib diisi");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user || !user.password) {
                    throw new Error("Pengguna tidak ditemukan");
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    throw new Error("Password salah");
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
};