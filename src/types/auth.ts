import { Role } from "@/types/database";

export interface AuthenticatedUser {
  id: string;
  name: string;
  nipp: string;
  role: Role;
}
