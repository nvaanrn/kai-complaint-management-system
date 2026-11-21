import NextAuth from "next-auth";
import { Role } from "@/types/database";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      nipp: string;
      role: Role;
    };
  }

  interface User {
    id: string;
    nipp: string;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    nipp: string;
    role: Role;
  }
}
